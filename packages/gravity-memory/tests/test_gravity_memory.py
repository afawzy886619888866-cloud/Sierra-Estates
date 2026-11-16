"""
Unit tests for GravityMemory adapter on top of OpenMemory.
Tests:
- Memory initialization
- .remember(event) and .recall(query, k)
- Persistent across-run deduplication via .seen(record_hash)
- .ingest_fact() and .memory["metadata"]["total_facts"]
- SIERRA_PERSONA configuration
- Backwards compatibility imports
"""

import os
import sys
import unittest
import tempfile
import uuid

# Ensure gravity-memory and openmemory are in path
PKG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PKG_DIR not in sys.path:
    sys.path.insert(0, PKG_DIR)

from gravity_memory import GravityMemory, SIERRA_PERSONA
from gravity_memory.gravity_core import GravityMemory as CoreGravityMemory
from memory.gravity_core import GravityMemory as LegacyGravityMemory
from config import SIERRA_PERSONA as LegacyPersona


class TestGravityMemoryAdapter(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.vault_file = os.path.join(self.tmp_dir.name, "vault.json")
        self.gm = GravityMemory(vault_path=self.vault_file, user_id=f"test_user_{uuid.uuid4().hex[:8]}")

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_persona_configuration(self):
        self.assertEqual(SIERRA_PERSONA["name"], "Sierra Master Bot")
        self.assertEqual(LegacyPersona["name"], "Sierra Master Bot")
        self.assertIn("12.0", SIERRA_PERSONA.get("version", ""))

    def test_import_compatibility(self):
        self.assertIs(GravityMemory, CoreGravityMemory)
        self.assertIs(GravityMemory, LegacyGravityMemory)

    def test_remember_and_recall(self):
        unique_token = f"luxury_villa_{uuid.uuid4().hex[:6]}"
        event = {
            "title_en": f"Standalone Villa in Mivida {unique_token}",
            "compound": "Mivida",
            "price": 14500000,
            "bedrooms": 4,
            "operation": "sale",
        }
        res = self.gm.remember(event)
        self.assertIsNotNone(res)

        # Recall using semantic query
        recalled = self.gm.recall("Mivida", k=5)
        self.assertIsInstance(recalled, list)

    def test_memory_backed_dedupe_across_runs(self):
        """
        Critical requirement: .seen(record_hash) must work persistently across ingestion runs.
        We instantiate gm1, mark/remember hashes, then instantiate gm2 and verify seen().
        """
        test_hash_1 = f"hash_mivida_{uuid.uuid4().hex[:10]}"
        test_hash_2 = f"normkey_hydepark_{uuid.uuid4().hex[:10]}"
        unseen_hash = f"unseen_key_{uuid.uuid4().hex[:10]}"

        # Instance 1: check and mark
        self.assertFalse(self.gm.seen(test_hash_1))
        self.gm.mark_seen(test_hash_1, meta={"source": "run_1"})
        self.assertTrue(self.gm.seen(test_hash_1))

        # Also verify remember() auto-indexes record_hash
        self.gm.remember({"record_hash": test_hash_2, "details": "Run 1 ingestion"})
        self.assertTrue(self.gm.seen(test_hash_2))

        # Instance 2 (simulating a fresh ingestion run in a new process/session):
        gm_run_2 = GravityMemory(vault_path=self.vault_file, user_id="sierra_system")
        self.assertTrue(
            gm_run_2.seen(test_hash_1),
            "Second ingestion run MUST see hash_1 marked by first run"
        )
        self.assertTrue(
            gm_run_2.seen(test_hash_2),
            "Second ingestion run MUST see hash_2 remembered by first run"
        )
        self.assertFalse(
            gm_run_2.seen(unseen_hash),
            "Unseen hash must return False in run 2"
        )

    def test_ingest_fact_and_metadata_total_facts(self):
        initial_facts = self.gm.memory["metadata"].get("total_facts", 0)

        self.gm.ingest_fact(
            category="compounds",
            source="Mivida",
            data={"code": "MI-3F-14M", "price": 14500000},
            weight=1
        )
        self.gm.ingest_fact(
            category="market_trends",
            source="fuzzy_ingestion",
            data={"trend": "Price increase in Eastown"},
            weight=3
        )

        current_facts = self.gm.memory["metadata"]["total_facts"]
        self.assertEqual(current_facts, initial_facts + 2)

        # Verify knowledge_graph entry
        kg = self.gm.memory.get("knowledge_graph", {})
        self.assertIn("compounds", kg)
        self.assertIn("Mivida", kg["compounds"])
        self.assertEqual(kg["compounds"]["Mivida"][0]["fact"]["code"], "MI-3F-14M")

        # Verify vault JSON was written to disk
        self.assertTrue(os.path.exists(self.vault_file))


if __name__ == "__main__":
    unittest.main()
