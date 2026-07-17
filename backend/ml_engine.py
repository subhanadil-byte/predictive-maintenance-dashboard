"""
Phase 1 — The Detector.

A schema-agnostic anomaly detector: it doesn't hardcode feature names, so the
same AssetDetector class works whether you feed it vibration/temperature data
from a pump, or voltage/current data from a switchgear cabinet, or acoustic
telemetry from a compressor. It fits an IsolationForest on a rolling window of
recent "normal-ish" readings per asset and rescales the raw isolation score
into an interpretable severity band and, where possible, a specific fault code.

Swap-in note: replace IsolationForest with a One-Class SVM (sklearn.svm.OneClassSVM)
by changing _build_model() alone — everything downstream is agnostic to which
estimator produced the score.
"""
from __future__ import annotations

from collections import deque
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

WINDOW_SIZE = 120          # rolling readings kept per asset before refit
REFIT_EVERY = 20           # refit cadence (ticks)
MIN_SAMPLES_TO_FIT = 30    # don't judge anomalies until we've seen enough baseline


# Fault-code inference rules: (feature substring, threshold-direction, code).
# This is intentionally simple/pluggable — in production this would be a
# rules table or a second lightweight classifier trained on labeled faults.
_FAULT_RULES: List[Tuple[str, str, str]] = [
    ("vib", "high", "ERR_BEARING_FRICTION"),
    ("temp", "high", "ERR_THERMAL_OVERLOAD"),
    ("v_a", "high", "ERR_VOLT_SPIKE_91"),
    ("v_b", "high", "ERR_VOLT_SPIKE_91"),
    ("v_c", "high", "ERR_VOLT_SPIKE_91"),
    ("current", "high", "ERR_OVERCURRENT_LOAD"),
    ("noise_floor", "high", "ERR_ACOUSTIC_ANOMALY"),
    ("snr", "low", "ERR_SIGNAL_DEGRADATION"),
    # Laptop/PC monitoring mode (see laptop_monitor.py):
    ("cpu_usage_percent", "high", "ERR_CPU_OVERLOAD"),
    ("memory_usage_percent", "high", "ERR_MEMORY_PRESSURE"),
    ("disk_read_mb", "high", "ERR_DISK_IO_SATURATION"),
    ("disk_write_mb", "high", "ERR_DISK_IO_SATURATION"),
    ("battery_percent", "low", "ERR_LOW_BATTERY"),
    ("thermal_pressure_percent", "low", "ERR_LAPTOP_THERMAL_THROTTLE"),
]


class AssetDetector:
    """One rolling IsolationForest per asset_id, created lazily."""

    def __init__(self) -> None:
        self._window: Deque[Dict[str, float]] = deque(maxlen=WINDOW_SIZE)
        self._model: Optional[IsolationForest] = None
        self._feature_order: List[str] = []
        self._baseline_mean: Dict[str, float] = {}
        self._baseline_std: Dict[str, float] = {}
        self._ticks_since_fit = 0

    def _build_model(self) -> IsolationForest:
        return IsolationForest(
            n_estimators=150,
            contamination=0.06,
            random_state=42,
            max_samples="auto",
        )

    def _vectorize(self, features: Dict[str, float]) -> Optional[np.ndarray]:
        if not self._feature_order:
            return None
        return np.array([[features.get(k, 0.0) for k in self._feature_order]])

    def _refit(self) -> None:
        if len(self._window) < MIN_SAMPLES_TO_FIT:
            return
        self._feature_order = sorted(self._window[0].keys())
        matrix = np.array(
            [[row.get(k, 0.0) for k in self._feature_order] for row in self._window]
        )
        self._baseline_mean = dict(zip(self._feature_order, matrix.mean(axis=0)))
        self._baseline_std = dict(
            zip(self._feature_order, matrix.std(axis=0) + 1e-6)
        )
        model = self._build_model()
        model.fit(matrix)
        self._model = model
        self._ticks_since_fit = 0

    def _infer_fault_code(self, features: Dict[str, float]) -> Tuple[Optional[str], List[str]]:
        contributing: List[str] = []
        fault_code: Optional[str] = None
        for name, value in features.items():
            mean = self._baseline_mean.get(name)
            std = self._baseline_std.get(name)
            if mean is None or std is None:
                continue
            z = (value - mean) / std
            if abs(z) < 2.5:
                continue
            contributing.append(name)
            for substr, direction, code in _FAULT_RULES:
                if substr in name:
                    if (direction == "high" and z > 0) or (direction == "low" and z < 0):
                        fault_code = fault_code or code
        return fault_code, contributing

    def score(self, features: Dict[str, float]) -> Tuple[float, bool, Optional[str], List[str]]:
        """Returns (anomaly_score in [0,1], is_anomaly, fault_code, contributing_features)."""
        self._window.append(features)
        self._ticks_since_fit += 1

        if self._model is None or self._ticks_since_fit >= REFIT_EVERY:
            self._refit()

        if self._model is None:
            # Still warming up the baseline.
            return 0.0, False, None, []

        vec = self._vectorize(features)
        if vec is None:
            return 0.0, False, None, []

        raw = self._model.decision_function(vec)[0]   # higher = more normal
        pred = self._model.predict(vec)[0]              # -1 anomaly, 1 normal
        # Rescale decision_function (~[-0.5, 0.5]) into an intuitive 0..1 anomaly score.
        anomaly_score = float(np.clip(0.5 - raw, 0.0, 1.0) * 2)
        is_anomaly = pred == -1

        fault_code, contributing = (None, [])
        if is_anomaly:
            fault_code, contributing = self._infer_fault_code(features)

        return round(anomaly_score, 4), bool(is_anomaly), fault_code, contributing


def severity_from_score(score: float, features: Dict[str, float]) -> str:
    """Maps anomaly score (+ a couple of hard physical ceilings) to a severity band."""
    catastrophic_ceiling = any(
        (("temp" in k and v > 130) or ("vib" in k and v > 25))
        for k, v in features.items()
    )
    if catastrophic_ceiling or score > 0.92:
        return "CATASTROPHIC"
    if score > 0.7:
        return "WARNING"
    if score > 0.45:
        return "WATCH"
    return "NOMINAL"


class DetectorRegistry:
    """Keeps one AssetDetector per asset_id alive across ticks."""

    def __init__(self) -> None:
        self._detectors: Dict[str, AssetDetector] = {}

    def get(self, asset_id: str) -> AssetDetector:
        if asset_id not in self._detectors:
            self._detectors[asset_id] = AssetDetector()
        return self._detectors[asset_id]


registry = DetectorRegistry()
