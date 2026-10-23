"""
GravityMemory Adapter on top of OpenMemory (packages/open-memory).
Re-implements the GravityMemory interface:
  - __init__(vault_path_or_config)
  - remember(event)
  - recall(query, k)
  - seen(record_hash) -> bool (persistent dedupe across ingestion runs)
  - ingest_fact(category, source, data, weight) (backwards compat)
  - .memory property -> metadata dictionary with total_facts
"""

import os
import sys
import json
import time
import asyncio
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Ensure openmemory can be imported from sibling package if not globally installed
OPENMEMORY_SRC = os.path.abspath(os.path.join(
    os.path.dirname(__file__),
    "../../open-memory/packages/openmemory-py/src"
))
if OPENMEMORY_SRC not in sys.path and os.path.exists(OPENMEMORY_SRC):
    sys.path.insert(0, OPENMEMORY_SRC)

try:
    import openmemory
    from openmemory.main import Memory as OpenMemory
    from openmemory.core.db import db as om_db
except ImportError as err:
    raise ImportError(f"GravityMemory requires openmemory-py: {err}") from err


def _run_coroutine_sync(coro):
    """Safely runs an async coroutine in a synchronous context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


class GravityMemory:
    """
    Adapter providing the GravityMemory interface on top of OpenMemory.
    Provides persistent across-run deduplication via `.seen(record_hash)`.
    """

    def __init__(
        self,
        vault_path: Optional[Union[str, Dict[str, Any]]] = None,
        user_id: str = "sierra_system",
        **kwargs: Any,
    ) -> None:
        self.user_id = user_id
        self.vault_path: Optional[str] = None
        self.config: Dict[str, Any] = {}

        if isinstance(vault_path, str):
            self.vault_path = vault_path
        elif isinstance(vault_path, dict):
            self.config = vault_path
            self.vault_path = vault_path.get("vault_path")

        # Initialize underlying OpenMemory instance
        self._om: OpenMemory = OpenMemory(user=self.user_id)
        om_db.connect()

        # Ensure persistent dedupe and fact tables exist in OpenMemory's SQLite store
        self._init_sqlite_schema()

        # In-memory vault cache for legacy metadata/knowledge graph structure
        self._vault: Dict[str, Any] = {
            "metadata": {
                "total_facts": 0,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
            },
            "knowledge_graph": {},
        }

        # If a JSON vault path was given, sync initial state from it if exists
        self._load_vault_json()
        self._sync_total_facts_from_db()

    def _init_sqlite_schema(self) -> None:
        """Creates the persistent deduplication and facts tables in OpenMemory SQLite."""
        sql_dedupe = """
        CREATE TABLE IF NOT EXISTS gravity_dedupe_hashes (
            record_hash TEXT PRIMARY KEY,
            seen_at INTEGER NOT NULL,
            meta TEXT
        );
        """
        sql_facts = """
        CREATE TABLE IF NOT EXISTS gravity_facts (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            source TEXT NOT NULL,
            data TEXT NOT NULL,
            weight REAL NOT NULL,
            timestamp TEXT NOT NULL
        );
        """
        om_db.execute(sql_dedupe)
        om_db.execute(sql_facts)
        om_db.commit()

    def _sync_total_facts_from_db(self) -> None:
        """Syncs the total_facts count from both openmemory memories and gravity_facts."""
        try:
            row = om_db.fetchone("SELECT COUNT(*) as cnt FROM gravity_facts")
            db_facts = int(row["cnt"]) if row else 0
            mem_row = om_db.fetchone("SELECT COUNT(*) as cnt FROM memories WHERE user_id=?", (self.user_id,))
            mem_count = int(mem_row["cnt"]) if mem_row else 0
            total = max(db_facts, mem_count, self._vault["metadata"].get("total_facts", 0))
            self._vault["metadata"]["total_facts"] = total
        except Exception:
            pass

    def _load_vault_json(self) -> None:
        """Loads existing facts from JSON file if vault_path points to an existing file."""
        if not self.vault_path:
            return
        try:
            p = Path(self.vault_path)
            if p.exists() and p.is_file():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        self._vault = data
                        if "metadata" not in self._vault:
                            self._vault["metadata"] = {}
                        if "knowledge_graph" not in self._vault:
                            self._vault["knowledge_graph"] = {}
        except Exception:
            pass

    def _save_vault_json(self) -> None:
        """Optionally persists the vault JSON cache to disk if vault_path is set."""
        if not self.vault_path:
            return
        try:
            p = Path(self.vault_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            self._vault["metadata"]["last_updated"] = datetime.now().isoformat()
            with open(p, "w", encoding="utf-8") as f:
                json.dump(self._vault, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    @property
    def memory(self) -> Dict[str, Any]:
        """Provides backward-compatibility for `self.memory.memory['metadata']['total_facts']`."""
        return self._vault

    def seen(self, record_hash: str) -> bool:
        """
        Checks whether this record_hash has been seen in this or ANY previous ingestion run.
        This provides durable, memory-backed deduplication across runs.
        """
        if not record_hash:
            return False
        row = om_db.fetchone(
            "SELECT 1 FROM gravity_dedupe_hashes WHERE record_hash = ?",
            (str(record_hash),)
        )
        return row is not None

    def mark_seen(self, record_hash: str, meta: Optional[Dict[str, Any]] = None) -> bool:
        """
        Marks a record_hash as seen in the persistent SQLite store.
        Returns True if newly inserted, False if already seen.
        """
        if not record_hash:
            return False
        if self.seen(record_hash):
            return False

        meta_json = json.dumps(meta, ensure_ascii=False) if meta else None
        om_db.execute(
            "INSERT OR IGNORE INTO gravity_dedupe_hashes (record_hash, seen_at, meta) VALUES (?, ?, ?)",
            (str(record_hash), int(time.time() * 1000), meta_json)
        )
        om_db.commit()
        return True

    def remember(self, event: Dict[str, Any], **kwargs: Any) -> Dict[str, Any]:
        """
        Writes a memory event into OpenMemory.
        Also registers any dedupe keys/hashes present in the event.
        """
        if not isinstance(event, dict):
            event = {"data": event}

        # Track any deduplication hashes present in the event
        for hash_key in ("hash", "record_hash", "normalized_key", "unit_code", "code"):
            val = event.get(hash_key)
            if val:
                self.mark_seen(str(val), meta=event)

        # Build textual representation for semantic indexing in OpenMemory
        content = event.get("content") or event.get("input") or event.get("title_en")
        if not content:
            content = json.dumps(event, ensure_ascii=False)

        tags = kwargs.get("tags") or []
        if "category" in event and event["category"] not in tags:
            tags.append(str(event["category"]))
        if "source" in event and event["source"] not in tags:
            tags.append(str(event["source"]))

        # Ingest into OpenMemory asynchronously
        res = _run_coroutine_sync(
            self._om.add(
                content=str(content),
                user_id=self.user_id,
                meta=event,
                tags=tags,
            )
        )

        self._vault["metadata"]["total_facts"] = self._vault["metadata"].get("total_facts", 0) + 1
        self._vault["metadata"]["last_updated"] = datetime.now().isoformat()
        self._save_vault_json()
        return res

    def recall(self, query: str, k: int = 5, **kwargs: Any) -> List[Dict[str, Any]]:
        """
        Semantic search / recall over OpenMemory for the given query.
        Returns top k matching memories.
        """
        if not query:
            return []

        results = _run_coroutine_sync(
            self._om.search(
                query=str(query),
                user_id=self.user_id,
                limit=k,
                **kwargs,
            )
        )
        return results or []

    def ingest_fact(
        self,
        category: str,
        source: str,
        data: Any,
        weight: int = 1,
        **kwargs: Any,
    ) -> None:
        """
        Compatibility method for legacy ingestion scripts:
        Stores a structured fact into Gravity knowledge graph and persists to OpenMemory.
        """
        ts = datetime.now().isoformat()
        fact_id = f"{category}_{source}_{int(time.time() * 1000)}"

        # Store in gravity_facts table
        data_json = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
        om_db.execute(
            "INSERT OR REPLACE INTO gravity_facts (id, category, source, data, weight, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (fact_id, str(category), str(source), data_json, float(weight), ts)
        )
        om_db.commit()

        # Update in-memory knowledge_graph cache
        kg = self._vault.setdefault("knowledge_graph", {})
        cat_dict = kg.setdefault(category, {})
        source_list = cat_dict.setdefault(source, [])
        source_list.append({
            "fact": data,
            "weight": weight,
            "timestamp": ts,
        })

        # Persist through OpenMemory
        event = {
            "id": fact_id,
            "category": category,
            "source": source,
            "fact": data,
            "weight": weight,
            "timestamp": ts,
        }
        self.remember(event, tags=[category, source])
