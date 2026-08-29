"""main.py.

Consolidated FastAPI backend for Sierra Estates PropTech integrations,
ECC Memory Engine, CRM synchronization, and Valuation Services.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List

# pylint: disable=import-error,no-name-in-module
try:
    from dotenv import load_dotenv  # pylint: disable=import-error
    load_dotenv()
except ImportError:
    def load_dotenv():  # type: ignore[misc]
        """Stub for load_dotenv when python-dotenv is not installed."""
        return None

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ImportError:
    # Stubs for environment without fastapi installed locally
    class FastAPI:  # type: ignore[no-redef]
        """FastAPI stub for static typing environments."""
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            pass
        def add_middleware(self, *args: Any, **kwargs: Any) -> None:
            pass
        def get(self, *args: Any, **kwargs: Any) -> Any:
            return lambda fn: fn
        def post(self, *args: Any, **kwargs: Any) -> Any:
            return lambda fn: fn

    class CORSMiddleware:  # type: ignore[no-redef]
        """CORS Middleware stub."""
        pass

    class BaseModel:  # type: ignore[no-redef]
        """BaseModel stub."""
        def model_dump(self) -> Dict[str, Any]:
            return self.__dict__

    def Field(*args: Any, **kwargs: Any) -> Any:  # type: ignore[misc]
        return None

from property_finder_sync import PropertyFinderSyncHub
from ecc_memory_engine import EpisodicContextCache
from valuation_agent_skill import RealEstateValuationAgent
from hubspot_sync import HubSpotSyncHub

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sierra Estates API",
    description=(
        "Consolidated Python backend for Sierra Estates integrations, "
        "ECC Memory, CRM & Valuation Engine."
    ),
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
valuation_agent = RealEstateValuationAgent()
hubspot_hub = HubSpotSyncHub()


class PortfolioAsset(BaseModel):
    """Schema representing an individual portfolio asset."""

    id: str = Field(..., description="Internal Sierra Estates asset identifier")
    title_en: str | None = None
    title_ar: str | None = None
    price: int | float | None = None
    location: str | None = None


class SyncRequest(BaseModel):
    """Request payload for batch portfolio synchronization."""

    assets: List[PortfolioAsset]


class EpisodePayload(BaseModel):
    """Payload for logging an episodic context event."""

    type: str = Field(
        "generic",
        description="Episode type e.g. inquiry, price_drop, viewing",
    )
    entityId: str = Field(
        ...,
        description="Target Sierra code or stakeholder phone/ID",
    )
    actor: str = Field("Agent", description="Source actor")
    summary: str = Field("", description="Natural summary")
    data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata payload",
    )


class PriceDropPayload(BaseModel):
    """Payload for tracking a price reduction event."""

    sierraCode: str = Field(..., description="Sierra unit code e.g. SE-MV-401")
    oldPrice: float = Field(..., description="Previous price in EGP")
    newPrice: float = Field(..., description="New price in EGP")
    source: str = Field(
        "WhatsApp Drop",
        description="Channel where drop was detected",
    )


@app.get("/health")
def health() -> Dict[str, str]:
    """Health check endpoint for the Python API service."""
    return {"status": "ok", "service": "apps/api"}


@app.post("/property-finder/format")
def format_asset(asset: PortfolioAsset) -> Dict[str, Any]:
    """Format a single portfolio asset for syndication feeds."""
    return sync_hub.format_portfolio_asset(asset.model_dump())


@app.post("/property-finder/sync")
def sync_assets(body: SyncRequest) -> Dict[str, Any]:
    """Syndicate a batch of assets to external property portals."""
    return sync_hub.trigger_batch_sync([asset.model_dump() for asset in body.assets])


@app.post("/ecc/episodes")
def record_episode(payload: EpisodePayload) -> Dict[str, Any]:
    """Record an episodic memory event in the ECC engine."""
    episode = ecc_engine.record_episode(payload.model_dump())
    return {"status": "success", "episode": episode}


@app.post("/ecc/price-reduction")
def track_price_reduction(payload: PriceDropPayload) -> Dict[str, Any]:
    """Record a price reduction event and compute hot deal flags."""
    result = ecc_engine.track_price_reduction(
        sierra_code=payload.sierraCode,
        old_price=payload.oldPrice,
        new_price=payload.newPrice,
        source=payload.source,
    )
    return {"status": "success", "data": result}


@app.get("/ecc/entities/{entity_id}")
def get_entity_memory(entity_id: str) -> Dict[str, Any]:
    """Retrieve graph memory and episode history for an entity."""
    entity = ecc_engine.entity_graph.get(entity_id)
    if not entity:
        return {"status": "not_found", "entityId": entity_id, "memory": None}
    return {"status": "success", "entityId": entity_id, "memory": entity}


@app.post("/valuation/analyze")
def analyze_valuation(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Perform valuation and financial ROI analysis."""
    analysis = valuation_agent.analyze(payload)
    return {"status": "success", "valuation": analysis}


@app.post("/crm/hubspot/contact")
def sync_hubspot_contact(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """Sync contact information with HubSpot CRM."""
    result = hubspot_hub.sync_contact(lead_data)
    return result


@app.post("/crm/hubspot/deal")
def create_hubspot_deal(deal_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new deal record in HubSpot CRM."""
    result = hubspot_hub.create_deal(deal_data)
    return result


if __name__ == "__main__":
    try:
        import uvicorn  # pylint: disable=import-error
        port = int(os.getenv("PORT", "8000"))
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
    except ImportError:
        logger.error("uvicorn is required to run the API server directly.")

