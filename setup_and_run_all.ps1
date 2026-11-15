# ==============================================================================
# Sierra Estates — Self-Contained Setup, Sheet Merger, Test & Launch Script
# Run in PowerShell from your repo root (e.g., H:\Sierra Estates):
#   powershell -ExecutionPolicy Bypass -File .\setup_and_run_all.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"
Write-Host "=== [1/7] Creating required directories ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path ".\apps\api\routers" | Out-Null
New-Item -ItemType Directory -Force -Path ".\apps\api\services" | Out-Null
New-Item -ItemType Directory -Force -Path ".\apps\api\tests" | Out-Null
New-Item -ItemType Directory -Force -Path ".\infra\n8n-workflows" | Out-Null
New-Item -ItemType Directory -Force -Path ".\supabase\migrations" | Out-Null
New-Item -ItemType Directory -Force -Path ".\scripts\python" | Out-Null
New-Item -ItemType Directory -Force -Path ".\downloads_sheets" | Out-Null

# ------------------------------------------------------------------------------
# [2/7] Write all generated files directly into the repository
# ------------------------------------------------------------------------------
Write-Host "=== [2/7] Writing ML Router, Extractor, SQL Migration & Sheet Merger ===" -ForegroundColor Cyan

@'
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

CATEGORICAL_COLS = ["compound", "property_type", "purpose", "finishing", "furnishing", "source_type"]
NUMERIC_COLS = [
    "area_sqm", "bedrooms", "bathrooms", "price_egp", "price_per_sqm",
    "price_vs_compound_avg", "photo_count", "has_photos", "title_len",
    "description_len", "has_virtual_tour", "is_direct_owner"
]
FEATURE_COLS = CATEGORICAL_COLS + NUMERIC_COLS

def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def verify_secret(x_n8n_secret: str | None) -> None:
    expected = os.getenv("N8N_WEBHOOK_SECRET")
    if expected and x_n8n_secret != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid X-N8N-Secret header")

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    for col, default in [("area_sqm", 0.0), ("bedrooms", 0.0), ("bathrooms", 0.0), ("price_egp", 0.0), ("photo_count", 0.0), ("lead_count", 0.0)]:
        work[col] = pd.to_numeric(work.get(col, default), errors="coerce").fillna(default)
    work["title_len"] = work.get("title", pd.Series("", index=work.index)).fillna("").astype(str).str.len()
    work["description_len"] = work.get("description", pd.Series("", index=work.index)).fillna("").astype(str).str.len()
    work["has_photos"] = (work["photo_count"] > 0).astype(int)
    work["has_virtual_tour"] = work.get("virtual_tour_url", pd.Series(None, index=work.index)).notna().astype(int)
    work["source_type"] = work.get("source_type", pd.Series("broker", index=work.index)).fillna("broker")
    work["is_direct_owner"] = (work["source_type"].str.lower() == "owner").astype(int)
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
    min_labeled_rows: int = Field(default=30, ge=5)
    dry_run: bool = Field(default=False)
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
    verify_secret(x_n8n_secret)
    sb = get_supabase()
    res = (
        sb.table("properties")
        .select("id, unit_code, title, description, compound, property_type, purpose, finishing, furnishing, source_type, area_sqm, bedrooms, bathrooms, price_egp, photo_count, virtual_tour_url, lead_count, status")
        .neq("status", "archived")
        .execute()
    )
    rows = res.data or []
    if not rows:
        return TrainScoreResponse(status="ok", mode="empty", total_units_scored=0, labeled_rows_used=0, top_criteria=[], top_units=[], updated_at=datetime.now(timezone.utc).isoformat())
    raw_df = pd.DataFrame(rows)
    feat_df = engineer_features(raw_df)
    labeled_mask = feat_df["lead_count"] > 0
    labeled_count = int(labeled_mask.sum())
    if labeled_count >= payload.min_labeled_rows:
        mode = "lightgbm"
        train_df = feat_df.loc[labeled_mask]
        model = lgb.LGBMRegressor(objective="regression", n_estimators=250, learning_rate=0.05, num_leaves=31, min_child_samples=10, subsample=0.8, colsample_bytree=0.8, random_state=42, verbose=-1)
        model.fit(train_df[FEATURE_COLS], np.log1p(train_df["lead_count"].to_numpy()), categorical_feature=CATEGORICAL_COLS)
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "features": FEATURE_COLS}, MODEL_PATH)
        scores = normalize_to_100(np.expm1(model.predict(feat_df[FEATURE_COLS])))
        gains = model.booster_.feature_importance(importance_type="gain")
        total_gain = float(np.sum(gains)) or 1.0
        paired = sorted(zip(FEATURE_COLS, gains), key=lambda x: x[1], reverse=True)
        top_criteria = [FeatureWeight(feature=n, importance_gain=round(float(v), 2), share_pct=round((float(v) / total_gain) * 100.0, 2)) for n, v in paired[:10]]
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
    feat_df["score_tier"] = pd.cut(feat_df["ai_score"], bins=[-1, 45, 74.9, 101], labels=["tier_2_search_only", "tier_1_standard", "tier_1_top_ad"]).astype(str)
    now_iso = datetime.now(timezone.utc).isoformat()
    if not payload.dry_run:
        updates = [{"id": r["id"], "ai_score": float(r["ai_score"]), "score_tier": r["score_tier"], "ai_scored_at": now_iso} for _, r in feat_df[["id", "ai_score", "score_tier"]].iterrows()]
        for i in range(0, len(updates), payload.batch_size):
            sb.table("properties").upsert(updates[i : i + payload.batch_size], on_conflict="id").execute()
    top_units = feat_df.sort_values("ai_score", ascending=False).head(10)[["id", "unit_code", "compound", "purpose", "price_egp", "ai_score", "score_tier"]].to_dict(orient="records")
    return TrainScoreResponse(status="ok", mode=mode, total_units_scored=len(feat_df), labeled_rows_used=labeled_count, top_criteria=top_criteria, top_units=top_units, updated_at=now_iso)
'@ | Set-Content -Path ".\apps\api\routers\ad_scoring.py" -Encoding UTF8

@'
from __future__ import annotations
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "routers"))
from ad_scoring import router as ad_scoring_router

app = FastAPI()
app.include_router(ad_scoring_router)
client = TestClient(app)

def _make_sample_rows(n: int, with_leads: bool = False) -> list[dict]:
    compounds = ["Madinaty", "Al Rehab", "Hyde Park", "Mivida", "Fifth Square"]
    return [
        {
            "id": f"prop-{i}",
            "unit_code": f"SE-{1000 + i}",
            "title": "Luxury 3BR Apartment in Fifth Settlement Direct Owner" if i % 2 == 0 else "Apt",
            "description": ("Spacious unit with landscape view. " * 25) if i % 2 == 0 else "Short desc",
            "compound": compounds[i % len(compounds)],
            "property_type": "Apartment" if i % 3 else "Villa",
            "purpose": "Rent" if i % 2 == 0 else "Sale",
            "finishing": "Fully Finished",
            "furnishing": "Furnished" if i % 2 == 0 else "Unfurnished",
            "source_type": "owner" if i % 2 == 0 else "broker",
            "area_sqm": 150 + (i % 5) * 30,
            "bedrooms": 3,
            "bathrooms": 2,
            "price_egp": 35000 + (i % 5) * 10000 if i % 2 == 0 else 8500000,
            "photo_count": 12 if i % 2 == 0 else 0,
            "virtual_tour_url": "https://tour.example.com/1" if i % 4 == 0 else None,
            "lead_count": (10 + (i % 7) * 3) if with_leads else 0,
            "status": "available",
        }
        for i in range(n)
    ]

def _mock_supabase(rows: list[dict]) -> MagicMock:
    sb = MagicMock()
    sb.table.return_value.select.return_value.neq.return_value.execute.return_value = MagicMock(data=rows)
    sb.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])
    return sb

def test_rejects_invalid_n8n_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    res = client.post("/api/ml/train-and-score", json={"dry_run": True}, headers={"X-N8N-Secret": "wrong"})
    assert res.status_code == 401

def test_cold_start_heuristic_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    with patch("ad_scoring.get_supabase", return_value=_mock_supabase(_make_sample_rows(10, False))):
        res = client.post("/api/ml/train-and-score", json={"min_labeled_rows": 30, "dry_run": True}, headers={"X-N8N-Secret": "super-secret"})
    assert res.status_code == 200
    assert res.json()["mode"] == "cold_start_heuristic"

def test_lightgbm_training_mode(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    monkeypatch.setenv("ML_MODEL_DIR", str(tmp_path))
    with patch("ad_scoring.get_supabase", return_value=_mock_supabase(_make_sample_rows(40, True))):
        res = client.post("/api/ml/train-and-score", json={"min_labeled_rows": 30, "dry_run": False, "batch_size": 20}, headers={"X-N8N-Secret": "super-secret"})
    assert res.status_code == 200
    assert res.json()["mode"] == "lightgbm"
'@ | Set-Content -Path ".\apps\api\tests\test_ad_scoring.py" -Encoding UTF8

@'
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lead_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS score_tier TEXT NOT NULL DEFAULT 'tier_2_search_only',
  ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_ai_score_desc
  ON public.properties (ai_score DESC, score_tier);
'@ | Set-Content -Path ".\supabase\migrations\20261115_add_ai_scoring_columns.sql" -Encoding UTF8

@'
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.9.0
python-dotenv>=1.0.1
httpx>=0.27.2
supabase>=2.9.0
google-auth>=2.35.0
google-api-python-client>=2.149.0
google-genai>=0.8.0
lightgbm>=4.5.0
pandas>=2.2.0
numpy>=1.26.0
scikit-learn>=1.5.0
joblib>=1.4.0
openpyxl>=3.1.5
pytest>=8.3.0
'@ | Set-Content -Path ".\requirements.txt" -Encoding UTF8

# If merge_local_sheets.py was downloaded to root, copy it to scripts/python/
if (Test-Path ".\merge_local_sheets.py") {
    Copy-Item ".\merge_local_sheets.py" ".\scripts\python\merge_local_sheets.py" -Force
}

# ------------------------------------------------------------------------------
# [3/7] Clean tracked temp & corrupted files
# ------------------------------------------------------------------------------
Write-Host "=== [3/7] Cleaning temp & corrupted files ===" -ForegroundColor Cyan
git rm -rf --cached supabase/.temp 2>$null
Get-ChildItem -Path . -Filter "*.bat" | Where-Object { $_.Name -match "[^\x00-\x7F]" -and $_.Name -notmatch "sierra" } | Remove-Item -Force

# ------------------------------------------------------------------------------
# [4/7] Install Python deps & run Sheet Merger if files exist in downloads_sheets
# ------------------------------------------------------------------------------
Write-Host "=== [4/7] Installing Python dependencies & merging sheets ===" -ForegroundColor Cyan
python -m pip install --upgrade -r .\requirements.txt

$sheetFiles = Get-ChildItem -Path ".\downloads_sheets" -Include "*.xlsx", "*.xls", "*.csv" -Recurse
if ($sheetFiles.Count -gt 0 -and (Test-Path ".\scripts\python\merge_local_sheets.py")) {
    python .\scripts\python\merge_local_sheets.py --input-dir .\downloads_sheets --output .\Sierra_Master_Merged.xlsx
} else {
    Write-Host "No .xlsx/.csv files in .\downloads_sheets yet — drop your downloaded sheets there and re-run merge_local_sheets.py anytime." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# [5/7] Run Python Pytest Suite
# ------------------------------------------------------------------------------
Write-Host "=== [5/7] Running LightGBM Ad Scorer Pytest Suite ===" -ForegroundColor Cyan
pytest .\apps\api\tests\test_ad_scoring.py -v

# ------------------------------------------------------------------------------
# [6/7] Run pnpm install & Turbo CI checks (Type-Check + Lint + Build)
# ------------------------------------------------------------------------------
Write-Host "=== [6/7] Running pnpm install & Turbo CI verification ===" -ForegroundColor Cyan
pnpm install
pnpm turbo run type-check lint build --filter=sierra-estates-realty

# ------------------------------------------------------------------------------
# [7/7] Start Local Daemons (:2785, :2786, :2790) & FastAPI (:8000)
# ------------------------------------------------------------------------------
Write-Host "=== [7/7] Starting Detached Daemons & FastAPI Server ===" -ForegroundColor Cyan
if (Test-Path ".\scripts\start-detached-daemons.ps1") {
    powershell -ExecutionPolicy Bypass -File .\scripts\start-detached-daemons.ps1
}
Write-Host "Setup complete! To start FastAPI interactively, run: uvicorn main:app --app-dir .\apps\api --host 0.0.0.0 --port 8000 --reload" -ForegroundColor Green
