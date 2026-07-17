"""
Stand-in for the field layer: generates realistic multi-axis telemetry per
asset at 2Hz, with occasional injected fault episodes (bearing wear,
voltage transients, thermal creep) so the ML/RAG/LLM pipeline has something
real to react to. In production, replace `next_reading()` with your
MQTT/OPC-UA/Modbus ingestion adapter — the TelemetryReading contract stays
the same either way.
"""
from __future__ import annotations

import math
import random
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from models import TelemetryReading


class AssetSimulator:
    def __init__(self, asset_id: str) -> None:
        self.asset_id = asset_id
        self._t0 = time.time()
        self._fault_episode: Optional[str] = None
        self._fault_ticks_remaining = 0

    def _maybe_start_fault(self) -> None:
        if self._fault_episode is None and random.random() < 0.004:
            self._fault_episode = random.choice(
                ["bearing", "voltage", "thermal", "acoustic"]
            )
            self._fault_ticks_remaining = random.randint(40, 90)

    def _tick_fault(self) -> None:
        if self._fault_episode is not None:
            self._fault_ticks_remaining -= 1
            if self._fault_ticks_remaining <= 0:
                self._fault_episode = None

    def next_reading(self) -> TelemetryReading:
        self._maybe_start_fault()
        t = time.time() - self._t0

        vib_base = 1.0 + 0.15 * math.sin(t * 2.0)
        temp_base = 65 + 3 * math.sin(t * 0.05)
        va, vb, vc = (
            415 + 3 * math.sin(t * 0.3),
            415 + 3 * math.sin(t * 0.3 + 2.09),
            415 + 3 * math.sin(t * 0.3 + 4.19),
        )
        current = 42 + 2 * math.sin(t * 0.4)
        noise_floor = -60 + random.gauss(0, 1)
        snr = 38 + random.gauss(0, 0.8)

        if self._fault_episode == "bearing":
            vib_base += 6 + random.uniform(0, 4)
            temp_base += 8
        elif self._fault_episode == "voltage":
            va += random.uniform(30, 55)
        elif self._fault_episode == "thermal":
            temp_base += random.uniform(25, 45)
        elif self._fault_episode == "acoustic":
            noise_floor += random.uniform(15, 25)
            snr -= random.uniform(10, 18)

        self._tick_fault()

        features: Dict[str, float] = {
            "vib_x": round(vib_base + random.gauss(0, 0.05), 4),
            "vib_y": round(vib_base * 0.9 + random.gauss(0, 0.05), 4),
            "vib_z": round(vib_base * 0.6 + random.gauss(0, 0.05), 4),
            "core_temp_c": round(temp_base + random.gauss(0, 0.3), 2),
            "v_a": round(va, 2),
            "v_b": round(vb, 2),
            "v_c": round(vc, 2),
            "load_current_a": round(current, 2),
            "noise_floor_db": round(noise_floor, 2),
            "snr_db": round(snr, 2),
        }

        return TelemetryReading(
            asset_id=self.asset_id,
            timestamp=datetime.now(timezone.utc),
            features=features,
        )


_simulators: Dict[str, AssetSimulator] = {}


def get_simulator(asset_id: str) -> AssetSimulator:
    if asset_id not in _simulators:
        _simulators[asset_id] = AssetSimulator(asset_id)
    return _simulators[asset_id]
