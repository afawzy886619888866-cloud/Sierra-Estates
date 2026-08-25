"""
ecc_memory_engine.py

Episodic Context Cache (ECC) Memory Engine (Python).
Provides 3-tier episodic and semantic entity graph memory for agents.
"""

import json
import time
from typing import Dict, Any, List, Optional

# A price drop at or above this percentage is tagged as a hot/distressed deal.
# Mirrors packages/agents/tools/eccMemoryEngine.ts — the two are not wired
# together (Python microservice vs. TS monorepo package), so this constant
# must be changed in both places if the threshold policy changes.
HOT_DEAL_THRESHOLD_PCT = 8.0


class EpisodicContextCache:
    def __init__(self, storage_path: Optional[str] = None):
        self.working_memory: Dict[str, Dict[str, Any]] = {}
        self.episodic_journal: List[Dict[str, Any]] = []
        self.entity_graph: Dict[str, Dict[str, Any]] = {}
        self.storage_path = storage_path or "obsidian-store.json"

    def record_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        full_episode = {
            "id": episode.get("id", f"ep-{int(time.time()*1000)}"),
            "timestamp": episode.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
            "type": episode.get("type", "generic"),
            "entityId": episode.get("entityId", "unknown"),
            "actor": episode.get("actor", "Agent"),
            "summary": episode.get("summary", ""),
            "data": episode.get("data", {}),
        }
        self.episodic_journal.append(full_episode)
        self._update_entity(full_episode)
        return full_episode

    def track_price_reduction(self, sierra_code: str, old_price: float, new_price: float, source: str = "WhatsApp Drop") -> Dict[str, Any]:
        drop_amount = old_price - new_price
        drop_pct = round((drop_amount / old_price) * 100, 1)
        is_hot = drop_pct >= 8.0

        episode = self.record_episode({
            "type": "price_drop",
            "entityId": sierra_code,
            "actor": "Direct Owner",
            "summary": f"Price drop of {drop_pct}% from {old_price:,} to {new_price:,} EGP ({source})",
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
            entity["historicalPrices"].append({
                "price": episode["data"]["newPrice"],
                "timestamp": episode["timestamp"],
            })
            if episode["data"].get("isHotDeal"):
                if "HOT_DISTRESSED_DEAL" not in entity["tags"]:
                    entity["tags"].append("HOT_DISTRESSED_DEAL")

        self.entity_graph[entity_id] = entity

if __name__ == "__main__":
    ecc = EpisodicContextCache()
    res = ecc.track_price_reduction("SE-MV-401", 40000000, 36000000, "Group #4")
    print("ECC Price Drop Recorded:", res["dropPct"], "% | Hot Deal:", res["isHotDeal"])
