from __future__ import annotations

import logging
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from property_finder_sync import PropertyFinderSyncHub
from ecc_memory_engine import EpisodicContextCache

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sierra Estates API",
    description="Consolidated Python backend for Sierra Estates integrations & ECC Memory.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sync_hub = PropertyFinderSyncHub()
ecc_engine = EpisodicContextCache()


class PortfolioAsset(BaseModel):
    id: str = Field(..., description="Internal Sierra Estates asset identifier")
    title_en: str | None = None
    title_ar: str | None = None
    price: int | float | None = None
    location: str | None = None


class SyncRequest(BaseModel):
    assets: List[PortfolioAsset]


class EpisodePayload(BaseModel):
    type: str = Field("generic", description="Episode type e.g. inquiry, price_drop, viewing")
    entityId: str = Field(..., description="Target Sierra code or stakeholder phone/ID")
    actor: str = Field("Agent", description="Source actor")
    summary: str = Field("", description="Natural summary")
    data: Dict[str, Any] = Field(default_factory=dict, description="Metadata payload")


class PriceDropPayload(BaseModel):
    sierraCode: str = Field(..., description="Sierra unit code e.g. SE-MV-401")
    oldPrice: float = Field(..., description="Previous price in EGP")
    newPrice: float = Field(..., description="New price in EGP")
    source: str = Field("WhatsApp Drop", description="Channel where drop was detected")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "apps/api"}


@app.post("/property-finder/format")
def format_asset(asset: PortfolioAsset) -> Dict[str, Any]:
    return sync_hub.format_portfolio_asset(asset.model_dump())


@app.post("/property-finder/sync")
def sync_assets(body: SyncRequest) -> Dict[str, Any]:
    return sync_hub.trigger_batch_sync([asset.model_dump() for asset in body.assets])


@app.post("/ecc/episodes")
def record_episode(payload: EpisodePayload) -> Dict[str, Any]:
    episode = ecc_engine.record_episode(payload.model_dump())
    return {"status": "success", "episode": episode}


@app.post("/ecc/price-reduction")
def track_price_reduction(payload: PriceDropPayload) -> Dict[str, Any]:
    result = ecc_engine.track_price_reduction(
        sierra_code=payload.sierraCode,
        old_price=payload.oldPrice,
        new_price=payload.newPrice,
        source=payload.source,
    )
    return {"status": "success", "data": result}


@app.get("/ecc/entities/{entity_id}")
def get_entity_memory(entity_id: str) -> Dict[str, Any]:
    entity = ecc_engine.entity_graph.get(entity_id)
    if not entity:
        return {"status": "not_found", "entityId": entity_id, "memory": None}
    return {"status": "success", "entityId": entity_id, "memory": entity}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)

