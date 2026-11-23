import json
import math
import unittest
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ML_RESULT = ROOT / "output" / "forecast.json"
BACKEND_RESULT = ROOT.parent / "backend" / "data" / "forecast.json"


class ForecastOutputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ml_result = json.loads(ML_RESULT.read_text(encoding="utf-8"))
        cls.backend_result = json.loads(BACKEND_RESULT.read_text(encoding="utf-8"))

    def test_backend_serves_exact_generated_result(self):
        self.assertEqual(self.backend_result, self.ml_result)

    def test_public_contract_and_horizon_are_valid(self):
        result = self.ml_result
        self.assertEqual(result["status"], "experimental")
        self.assertFalse(result["company_data"])
        self.assertEqual(result["currency"], "GBP")
        self.assertEqual(len(result["forecast"]), 14)
        last_history = date.fromisoformat(result["history"][-1]["date"])
        first_forecast = date.fromisoformat(result["forecast"][0]["date"])
        self.assertEqual(first_forecast, last_history + timedelta(days=1))

    def test_metrics_are_finite_and_differentiated_by_horizon(self):
        result = self.ml_result
        one_step = result["horizon_metrics"]["one_step"]
        recursive = result["horizon_metrics"]["recursive_14_day"]
        self.assertEqual(result["metrics"]["mae"], one_step["mae"])
        self.assertEqual(recursive["horizon_days"], 14)
        self.assertEqual(recursive["observations"], 70)
        self.assertEqual(len(recursive["blocks"]), 5)
        for metrics in (one_step, recursive):
            for key in ("mae", "rmse", "baseline_mae", "baseline_rmse"):
                self.assertTrue(math.isfinite(metrics[key]))
                self.assertGreaterEqual(metrics[key], 0)

    def test_rolling_origins_are_chronological_and_non_overlapping(self):
        blocks = self.ml_result["horizon_metrics"]["recursive_14_day"]["blocks"]
        previous_end = None
        previous_samples = 0
        for block in blocks:
            origin = date.fromisoformat(block["origin"])
            end = date.fromisoformat(block["end"])
            self.assertEqual(end, origin + timedelta(days=13))
            if previous_end is not None:
                self.assertGreater(origin, previous_end)
            self.assertGreater(block["train_samples"], previous_samples)
            for key in ("mae", "rmse", "baseline_mae", "baseline_rmse"):
                self.assertTrue(math.isfinite(block["metrics"][key]))
                self.assertGreaterEqual(block["metrics"][key], 0)
            previous_end = end
            previous_samples = block["train_samples"]


if __name__ == "__main__":
    unittest.main()
