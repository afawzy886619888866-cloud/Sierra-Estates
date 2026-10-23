"""
Unit tests for hardened Episodic Context Cache (ECC) Memory Engine.
Validates input sanitization, bounded price tracking, and idempotent graph updates.
"""

import unittest
from ecc_memory_engine import EpisodicContextCache, HOT_DEAL_THRESHOLD_PCT

class TestECCMemoryHardening(unittest.TestCase):
    def setUp(self):
        self.ecc = EpisodicContextCache()

    def test_input_validation_empty_code(self):
        with self.assertRaises(ValueError):
            self.ecc.track_price_reduction("", 40000000, 36000000)

    def test_input_validation_negative_or_zero_price(self):
        with self.assertRaises(ValueError):
            self.ecc.track_price_reduction("SE-MV-401", -100, 36000000)
        with self.assertRaises(ValueError):
            self.ecc.track_price_reduction("SE-MV-401", 40000000, 0)

    def test_input_validation_non_numeric_price(self):
        with self.assertRaises(ValueError):
            self.ecc.track_price_reduction("SE-MV-401", "invalid_price", 36000000)

    def test_hot_deal_calculation(self):
        # 10% drop on 40M -> 36M is >= 8.0%
        res = self.ecc.track_price_reduction("SE-MV-401", 40000000, 36000000)
        self.assertEqual(res["dropPct"], 10.0)
        self.assertTrue(res["isHotDeal"])
        entity = self.ecc.entity_graph["SE-MV-401"]
        self.assertIn("HOT_DISTRESSED_DEAL", entity["tags"])

        # 5% drop on 40M -> 38M is < 8.0%
        res2 = self.ecc.track_price_reduction("SE-HY-202", 40000000, 38000000)
        self.assertEqual(res2["dropPct"], 5.0)
        self.assertFalse(res2["isHotDeal"])
        entity2 = self.ecc.entity_graph["SE-HY-202"]
        self.assertNotIn("HOT_DISTRESSED_DEAL", entity2["tags"])

    def test_episode_idempotency_deduplication(self):
        episode_payload = {
            "id": "ep-fixed-12345",
            "timestamp": "2026-09-12T10:00:00Z",
            "type": "price_drop",
            "entityId": "SE-MV-401",
            "summary": "Price drop test",
            "data": {"newPrice": 36000000, "isHotDeal": True}
        }

        # First recording
        ep1 = self.ecc.record_episode(episode_payload)
        self.assertEqual(len(self.ecc.episodic_journal), 1)

        # Duplicate recording with same id
        ep2 = self.ecc.record_episode(episode_payload)
        self.assertEqual(len(self.ecc.episodic_journal), 1)
        self.assertEqual(ep1["id"], ep2["id"])

        # Duplicate historical prices should not be added to entity graph
        entity = self.ecc.entity_graph["SE-MV-401"]
        self.assertEqual(len(entity["historicalPrices"]), 1)

if __name__ == "__main__":
    unittest.main()
