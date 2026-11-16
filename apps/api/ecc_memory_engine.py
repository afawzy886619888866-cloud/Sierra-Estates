"""
ecc_memory_engine.py

Episodic Context Cache (ECC) Memory Engine (Python).
Provides 3-tier episodic and semantic entity graph memory for agents.
"""

import time
from typing import Dict, Any, List, Optional

# A price drop at or above this percentage is tagged as a hot/distressed deal.
# Mirrors packages/agents/tools/eccMemoryEngine.ts — the two are not wired
# together (Python microservice vs. TS monorepo package), so this constant
# must be changed in both places if the threshold policy changes.
HOT_DEAL_THRESHOLD_PCT = 8.0


class EpisodicContextCache:
    """Episodic Context Cache and entity graph tracker for real estate agents."""

    def __init__(self, storage_path: Optional[str] = None):
        """Initialize working memory, episodic journal, and entity graph."""
        self.working_memory: Dict[str, Dict[str, Any]] = {}
        self.episodic_journal: List[Dict[str, Any]] = []
        self.entity_graph: Dict[str, Dict[str, Any]] = {}
        self.storage_path = storage_path or "obsidian-store.json"

    def record_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        """Record an episode in journal with idempotency deduplication and update entity graph."""
        ep_id = episode.get("id")
        timestamp = episode.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
        entity_id = episode.get("entityId", "unknown")
        ep_type = episode.get("type", "generic")
        summary = episode.get("summary", "")

        # Check existing journal for idempotency (matching ID or matching entity+type+timestamp)
        for existing in self.episodic_journal:
            if ep_id and existing.get("id") == ep_id:
                return existing
            if (
                existing.get("entityId") == entity_id
                and existing.get("type") == ep_type
                and existing.get("timestamp") == timestamp
                and existing.get("summary") == summary
            ):
                return existing

        full_episode = {
            "id": ep_id or f"ep-{int(time.time()*1000)}",
            "timestamp": timestamp,
            "type": ep_type,
            "entityId": entity_id,
            "actor": episode.get("actor", "Agent"),
            "summary": summary,
            "data": episode.get("data", {}),
        }
        self.episodic_journal.append(full_episode)
        self._update_entity(full_episode)
        return full_episode

    def track_price_reduction(
        self,
        sierra_code: str,
        old_price: float,
        new_price: float,
        source: str = "WhatsApp Drop",
    ) -> Dict[str, Any]:
        """Track price reduction for an asset and flag hot deals with robust validation."""
        if not sierra_code or not isinstance(sierra_code, str):
            raise ValueError("sierra_code must be a non-empty string")

        try:
            old_price = float(old_price)
            new_price = float(new_price)
        except (ValueError, TypeError):
            raise ValueError("old_price and new_price must be valid numeric values")

        if old_price <= 0 or new_price <= 0:
            raise ValueError("Prices must be positive numbers greater than 0")

        drop_amount = old_price - new_price
        drop_pct = round((drop_amount / old_price) * 100, 1) if old_price else 0.0
        is_hot = drop_pct >= HOT_DEAL_THRESHOLD_PCT

        summary_text = (
            f"Price drop of {drop_pct}% from {old_price:,} "
            f"to {new_price:,} EGP ({source})"
        )
        episode = self.record_episode({
            "type": "price_drop",
            "entityId": sierra_code,
            "actor": "Direct Owner",
            "summary": summary_text,
            "data": {
                "sierraCode": sierra_code,
                "oldPrice": old_price,
                "newPrice": new_price,
                "dropAmount": drop_amount,
                "dropPct": drop_pct,
                "isHotDeal": is_hot,
            }
        })
        return {"episode": episode, "dropPct": drop_pct, "isHotDeal": is_hot}

    def _update_entity(self, episode: Dict[str, Any]) -> None:
        entity_id = episode["entityId"]
        entity = self.entity_graph.get(entity_id, {
            "id": entity_id,
            "type": "property" if entity_id.startswith("SE-") else "stakeholder",
            "tags": [],
            "historicalPrices": [],
        })

        if episode["type"] == "price_drop" and "newPrice" in episode.get("data", {}):
            price_val = episode["data"]["newPrice"]
            ts_val = episode["timestamp"]
            # Deduplicate historical price entries by timestamp
            already_recorded = any(
                p.get("timestamp") == ts_val and p.get("price") == price_val
                for p in entity["historicalPrices"]
            )
            if not already_recorded:
                entity["historicalPrices"].append({
                    "price": price_val,
                    "timestamp": ts_val,
                })

            if episode["data"].get("isHotDeal"):
                if "HOT_DISTRESSED_DEAL" not in entity["tags"]:
                    entity["tags"].append("HOT_DISTRESSED_DEAL")

        self.entity_graph[entity_id] = entity

if __name__ == "__main__":
    ecc = EpisodicContextCache()
    res = ecc.track_price_reduction("SE-MV-401", 40000000, 36000000, "Group #4")
    print("ECC Price Drop Recorded:", res["dropPct"], "% | Hot Deal:", res["isHotDeal"])
