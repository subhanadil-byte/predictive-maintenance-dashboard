"""
Real telemetry source — reads YOUR ACTUAL LAPTOP's live stats instead of the
fake simulator. Swap this in when you don't have a real industrial machine
to hook sensors up to, but still want the whole pipeline (ML detector, RAG,
Gen AI copilot, emergency escalation) reacting to *real* data.

Mapping (industrial concept -> laptop equivalent):
    vibration        -> CPU usage %      (higher load ~ more "vibration")
    core temperature  -> CPU temperature  (best-effort; not all OSes expose this)
    voltage/current   -> battery % and charging state
    load current      -> RAM usage %
    acoustic/noise     -> disk read/write throughput

This produces the exact same {feature_name: float} shape as
telemetry_simulator.py, so nothing downstream (ml_engine, rag_engine,
llm_copilot, the WebSocket route) needs to change to use it.
"""
from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from typing import Dict, Optional

import psutil

from models import TelemetryReading


class LaptopMonitor:
    """Reads real stats from the machine this backend process is running on."""

    def __init__(self, asset_id: str) -> None:
        self.asset_id = asset_id
        self._last_disk = psutil.disk_io_counters()
        # First call to cpu_percent() always returns 0 — prime it once.
        psutil.cpu_percent(interval=None)

    def _read_cpu_temp_c(self) -> Optional[float]:
        """
        Real CPU temperature, tried in order of availability:
          1. psutil.sensors_temperatures() — works out of the box on Linux.
          2. the `osx-cpu-temp` CLI tool, if installed on macOS
             (`brew install osx-cpu-temp`) — reads the real SMC sensor.
        Returns None if neither is available (e.g. macOS without that tool,
        or Windows without a vendor driver) — see get_thermal_pressure_percent()
        below for a zero-install real alternative on macOS.
        """
        try:
            temps = psutil.sensors_temperatures()  # not available on macOS/Windows
            for entries in temps.values():
                if entries:
                    return float(entries[0].current)
        except AttributeError:
            pass
        except Exception:
            pass

        try:
            result = subprocess.run(
                ["osx-cpu-temp"], capture_output=True, text=True, timeout=1
            )
            if result.returncode == 0 and result.stdout.strip():
                value = result.stdout.strip().replace("°C", "").replace("°F", "").strip()
                return float(value)
        except (FileNotFoundError, subprocess.SubprocessError, ValueError):
            pass

        return None

    def get_thermal_pressure_percent(self) -> Optional[float]:
        """
        Real, zero-install thermal reading for macOS: asks macOS's own power
        management system how much it's currently throttling the CPU due to
        heat, via `pmset -g therm`. 100 = full speed, no thermal throttling.
        Lower numbers mean the Mac is actively slowing itself down because
        it's running hot — this is genuine live data from the OS, not an
        estimate, and needs no extra software installed (unlike CPU-degrees
        temperature, which macOS doesn't expose without a third-party tool).
        """
        try:
            result = subprocess.run(
                ["pmset", "-g", "therm"], capture_output=True, text=True, timeout=1
            )
            for line in result.stdout.splitlines():
                if "CPU_Speed_Limit" in line:
                    return float(line.split("=")[-1].strip())
        except (FileNotFoundError, subprocess.SubprocessError, ValueError):
            pass
        return None

    def get_top_processes(self) -> Dict[str, object]:
        """
        THE UNIQUE PART: identifies which actual running app/process is
        responsible for the current CPU or memory load, by name — right now,
        on this machine. This gets handed to the Gen AI copilot so its advice
        says "Chrome is using 61% CPU" instead of generic "check Task Manager"
        boilerplate. This is real, live data, not a canned example.
        """
        top_cpu = {"name": None, "percent": 0.0}
        top_mem = {"name": None, "mb": 0.0}
        try:
            for proc in psutil.process_iter(["name", "cpu_percent", "memory_info"]):
                try:
                    info = proc.info
                    cpu = info.get("cpu_percent") or 0.0
                    mem_mb = (info.get("memory_info").rss / (1024 * 1024)) if info.get("memory_info") else 0.0
                    if cpu > top_cpu["percent"]:
                        top_cpu = {"name": info.get("name"), "percent": round(cpu, 1)}
                    if mem_mb > top_mem["mb"]:
                        top_mem = {"name": info.get("name"), "mb": round(mem_mb, 1)}
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception:
            pass
        return {"top_cpu_process": top_cpu, "top_memory_process": top_mem}

    def next_reading(self) -> TelemetryReading:
        cpu_percent = psutil.cpu_percent(interval=None)
        memory_percent = psutil.virtual_memory().percent

        disk_now = psutil.disk_io_counters()
        read_mb = max(0.0, (disk_now.read_bytes - self._last_disk.read_bytes) / (1024 * 1024))
        write_mb = max(0.0, (disk_now.write_bytes - self._last_disk.write_bytes) / (1024 * 1024))
        self._last_disk = disk_now

        battery = psutil.sensors_battery()  # None on desktops with no battery
        battery_percent = float(battery.percent) if battery else 100.0
        battery_charging = 1.0 if (battery and battery.power_plugged) else 0.0

        cpu_temp = self._read_cpu_temp_c()
        thermal_pressure = self.get_thermal_pressure_percent()

        features: Dict[str, float] = {
            "cpu_usage_percent": round(cpu_percent, 2),
            "memory_usage_percent": round(memory_percent, 2),
            "disk_read_mb": round(read_mb, 3),
            "disk_write_mb": round(write_mb, 3),
            "battery_percent": round(battery_percent, 2),
            "battery_charging": battery_charging,
        }
        if cpu_temp is not None:
            features["cpu_temp_c"] = round(cpu_temp, 2)
        if thermal_pressure is not None:
            features["thermal_pressure_percent"] = round(thermal_pressure, 2)

        return TelemetryReading(
            asset_id=self.asset_id,
            timestamp=datetime.now(timezone.utc),
            features=features,
        )


_monitors: Dict[str, LaptopMonitor] = {}


def get_laptop_monitor(asset_id: str) -> LaptopMonitor:
    if asset_id not in _monitors:
        _monitors[asset_id] = LaptopMonitor(asset_id)
    return _monitors[asset_id]
