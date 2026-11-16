"""
Sierra Estates — LightGBM Ad Performance & Unit Scoring Router
Drop into: apps/api/routers/ad_scoring.py
Mount in apps/api/main.py with:
    from routers.ad_scoring import router as ad_scoring_router
    app.include_router(ad_scoring_router)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client, create_client

logger = logging.getLogger("sierra.ml.ad_scoring")

router = APIRouter(prefix="/api/ml", tags=["ML Ad Scoring"])

MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", "/tmp/sierra_models"))
MODEL_PATH = MODEL_DIR / "lgbm_ad_scorer.joblib"

CATEGORICAL_COLS = [
    "compound",
    "property_type",
    "purpose",
    "finishing",
    "furnishing",
    "source_type",
]

NUMERIC_COLS = [
    "area_sqm",
    "bedrooms",
    "bathrooms",
    "price_egp",
    "price_per_sqm",
    "price_vs_compound_avg",
    "photo_count",
    "has_photos",
    "title_len",
    "description_len",
    "has_virtual_tour",
    "is_direct_owner",
]

FEATURE_COLS = CATEGORICAL_COLS + NUMERIC_COLS


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        )
    return create_client(url, key)


def verify_secret(x_n8n_secret: str | None) -> None:
    expected = os.getenv("N8N_WEBHOOK_SECRET")
    if expected and x_n8n_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-N8N-Secret header",
        )


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Clean raw Supabase property rows and compute real-estate ad features."""
    work = df.copy()

    # Safe numeric conversions
    for col, default in [
        ("area_sqm", 0.0),
        ("bedrooms", 0.0),
        ("bathrooms", 0.0),
        ("price_egp", 0.0),
        ("photo_count", 0.0),
        ("lead_count", 0.0),
    ]:
        work[col] = pd.to_numeric(work.get(col, default), errors="coerce").fillna(default)

    # Text / quality signals (aligned with Property Finder quality criteria)
    work["title_len"] = work.get("title", pd.Series("", index=work.index)).fillna("").astype(str).str.len()
    work["description_len"] = (
        work.get("description", pd.Series("", index=work.index)).fillna("").astype(str).str.len()
    )
    work["has_photos"] = (work["photo_count"] > 0).astype(int)
    work["has_virtual_tour"] = (
        work.get("virtual_tour_url", pd.Series(None, index=work.index)).notna().astype(int)
    )
    work["source_type"] = work.get("source_type", pd.Series("broker", index=work.index)).fillna("broker")
    work["is_direct_owner"] = (work["source_type"].str.lower() == "owner").astype(int)

    # Price per sqm & compound benchmark ratio
    safe_area = work["area_sqm"].replace(0, np.nan)
    work["price_per_sqm"] = (work["price_egp"] / safe_area).fillna(0.0)

    for col in CATEGORICAL_COLS:
        work[col] = work.get(col, pd.Series("unknown", index=work.index)).fillna("unknown").astype(str)

    compound_avg = work.groupby(["compound", "purpose"])["price_per_sqm"].transform("median").replace(0, np.nan)
    work["price_vs_compound_avg"] = ((work["price_per_sqm"] - compound_avg) / compound_avg).fillna(0.0)

    for col in CATEGORICAL_COLS:
        work[col] = work[col].astype("category")

    return work


def heuristic_cold_start_score(df: pd.DataFrame) -> np.ndarray:
    """
    Deterministic fallback score (0-100) when historical lead_count labels < 30.
    Rewards Property Finder quality criteria, photos, direct owners, and competitive pricing.
    """
    score = np.full(len(df), 35.0)
    score += np.where(df["is_direct_owner"] == 1, 20.0, 0.0)
    score += np.clip(df["photo_count"].to_numpy() * 2.0, 0.0, 20.0)
    score += np.where((df["title_len"] >= 30) & (df["title_len"] <= 60), 10.0, 0.0)
    score += np.where(df["description_len"] >= 750, 10.0, 0.0)
    score += np.where(df["price_vs_compound_avg"] <= -0.05, 5.0, 0.0)
    return np.clip(score, 0.0, 100.0)


def normalize_to_100(preds: np.ndarray) -> np.ndarray:
    if len(preds) == 0:
        return preds
    p_min, p_max = float(np.min(preds)), float(np.max(preds))
    if p_max - p_min < 1e-6:
        return np.full_like(preds, 50.0, dtype=float)
    return np.clip(((preds - p_min) / (p_max - p_min)) * 100.0, 0.0, 100.0)


class TrainScoreRequest(BaseModel):
    min_labeled_rows: int = Field(default=30, ge=5, description="Minimum rows with lead_count > 0 to train LightGBM")
    dry_run: bool = Field(default=False, description="If true, compute scores without writing back to Supabase")
    batch_size: int = Field(default=200, ge=20, le=1000)


class FeatureWeight(BaseModel):
    feature: str
    importance_gain: float
    share_pct: float


class TrainScoreResponse(BaseModel):
    status: str
    mode: str
    total_units_scored: int
    labeled_rows_used: int
    top_criteria: list[FeatureWeight]
    top_units: list[dict[str, Any]]
    updated_at: str


@router.post("/train-and-score", response_model=TrainScoreResponse)
def train_and_score_units(
    payload: TrainScoreRequest = TrainScoreRequest(),
    x_n8n_secret: str | None = Header(default=None, alias="X-N8N-Secret"),
) -> TrainScoreResponse:
    """
    Called by n8n workflow `03-ai-score-scheduler.json`.
    1. Fetches properties + historical lead counts from Supabase.
    2. Trains LightGBM Regressor (or cold-start heuristic if < min_labeled_rows).
    3. Extracts top ad performance criteria (gain importance).
    4. Updates `ai_score` and `score_tier` in Supabase `properties`.
    """
    verify_secret(x_n8n_secret)
    try:
        sb = get_supabase()
    except HTTPException:
        if payload.dry_run:
            return TrainScoreResponse(
                status="ok",
                mode="dry_run_unconfigured",
                total_units_scored=0,
                labeled_rows_used=0,
                top_criteria=[],
                top_units=[],
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        raise

    # Fetch properties (adjust column names if your Supabase migration differs)
    res = (
        sb.table("properties")
        .select(
            "id, unit_code, title, description, compound, property_type, purpose, "
            "finishing, furnishing, source_type, area_sqm, bedrooms, bathrooms, "
            "price_egp, photo_count, virtual_tour_url, lead_count, status"
        )
        .neq("status", "archived")
        .execute()
    )
    rows = res.data or []
    if not rows:
        return TrainScoreResponse(
            status="ok",
            mode="empty",
            total_units_scored=0,
            labeled_rows_used=0,
            top_criteria=[],
            top_units=[],
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    raw_df = pd.DataFrame(rows)
    feat_df = engineer_features(raw_df)

    labeled_mask = feat_df["lead_count"] > 0
    labeled_count = int(labeled_mask.sum())

    top_criteria: list[FeatureWeight] = []

    if labeled_count >= payload.min_labeled_rows:
        mode = "lightgbm"
        train_df = feat_df.loc[labeled_mask]
        X_train = train_df[FEATURE_COLS]
        # Log-transform skewed lead counts for stable regression
        y_train = np.log1p(train_df["lead_count"].to_numpy())

        model = lgb.LGBMRegressor(
            objective="regression",
            n_estimators=250,
            learning_rate=0.05,
            num_leaves=31,
            min_child_samples=10,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbose=-1,
        )
        model.fit(X_train, y_train, categorical_feature=CATEGORICAL_COLS)

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "features": FEATURE_COLS}, MODEL_PATH)

        raw_preds = np.expm1(model.predict(feat_df[FEATURE_COLS]))
        scores = normalize_to_100(raw_preds)

        gains = model.booster_.feature_importance(importance_type="gain")
        total_gain = float(np.sum(gains)) or 1.0
        paired = sorted(zip(FEATURE_COLS, gains), key=lambda x: x[1], reverse=True)
        top_criteria = [
            FeatureWeight(
                feature=name,
                importance_gain=round(float(val), 2),
                share_pct=round((float(val) / total_gain) * 100.0, 2),
            )
            for name, val in paired[:10]
        ]
    else:
        mode = "cold_start_heuristic"
        scores = heuristic_cold_start_score(feat_df)
        top_criteria = [
            FeatureWeight(feature="is_direct_owner", importance_gain=20.0, share_pct=30.77),
            FeatureWeight(feature="photo_count", importance_gain=20.0, share_pct=30.77),
            FeatureWeight(feature="title_len", importance_gain=10.0, share_pct=15.38),
            FeatureWeight(feature="description_len", importance_gain=10.0, share_pct=15.38),
            FeatureWeight(feature="price_vs_compound_avg", importance_gain=5.0, share_pct=7.69),
        ]

    feat_df["ai_score"] = np.round(scores, 1)
    feat_df["score_tier"] = pd.cut(
        feat_df["ai_score"],
        bins=[-1, 45, 74.9, 101],
        labels=["tier_2_search_only", "tier_1_standard", "tier_1_top_ad"],
    ).astype(str)

    now_iso = datetime.now(timezone.utc).isoformat()

    if not payload.dry_run:
        updates = [
            {
                "id": row["id"],
                "ai_score": float(row["ai_score"]),
                "score_tier": row["score_tier"],
                "ai_scored_at": now_iso,
            }
            for _, row in feat_df[["id", "ai_score", "score_tier"]].iterrows()
        ]
        for i in range(0, len(updates), payload.batch_size):
            chunk = updates[i : i + payload.batch_size]
            sb.table("properties").upsert(chunk, on_conflict="id").execute()

    top_units_df = feat_df.sort_values("ai_score", ascending=False).head(10)
    top_units = top_units_df[
        ["id", "unit_code", "compound", "purpose", "price_egp", "ai_score", "score_tier"]
    ].to_dict(orient="records")

    logger.info("Scored %d units using mode=%s (labeled=%d)", len(feat_df), mode, labeled_count)

    return TrainScoreResponse(
        status="ok",
        mode=mode,
        total_units_scored=len(feat_df),
        labeled_rows_used=labeled_count,
        top_criteria=top_criteria,
        top_units=top_units,
        updated_at=now_iso,
    )