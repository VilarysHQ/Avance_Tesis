import unittest

import numpy as np
import pandas as pd

from train import build_model, create_features, recursive_seasonal_baseline


class TrainingPipelineTests(unittest.TestCase):
    def test_features_use_only_prior_observations(self):
        index = pd.date_range("2011-01-01", periods=40, freq="D")
        series = pd.Series(np.arange(1.0, 41.0), index=index)
        features = create_features(series)
        first = features.iloc[0]

        self.assertEqual(features.index[0], index[28])
        self.assertEqual(first["lag_1"], series.iloc[27])
        self.assertEqual(first["lag_28"], series.iloc[0])
        self.assertEqual(first["rolling_7"], series.iloc[21:28].mean())
        self.assertEqual(first["rolling_28"], series.iloc[:28].mean())

    def test_recursive_baseline_reuses_only_available_history(self):
        index = pd.date_range("2011-01-01", periods=28, freq="D")
        history = pd.Series(np.arange(1.0, 29.0), index=index)
        future = pd.date_range("2011-01-29", periods=14, freq="D")

        predictions = recursive_seasonal_baseline(history, future)

        np.testing.assert_array_equal(predictions[:7], np.arange(22.0, 29.0))
        np.testing.assert_array_equal(predictions[7:], predictions[:7])

    def test_random_forest_has_reproducible_seed(self):
        parameters = build_model().get_params()
        self.assertEqual(parameters["random_state"], 42)
        self.assertEqual(parameters["n_estimators"], 200)
        self.assertEqual(parameters["min_samples_leaf"], 3)


if __name__ == "__main__":
    unittest.main()
