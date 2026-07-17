"""
Phase 4 — Autonomous Safe-State & Emergency Dispatch Escalation.

When an asset hits CATASTROPHIC severity, an EmergencyCase is opened with a
300-second (05:00) countdown. If no operator override or manual dispatch
happens before it elapses, auto-dispatch fires against DISPATCH_WEBHOOK_URL
with a geolocation + asset payload. Countdown enforcement is driven by the
server (asyncio task), not the client clock, so it can't be bypassed by
closing the browser tab.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Awaitable, Callable, Dict, Optional

import httpx

from audit_logger import log_event
from models import EmergencyDispatchPayload

COUNTDOWN_SECONDS = 300  # 05:00
COOLDOWN_SECONDS = 90    # after a case is resolved, wait this long before re-alerting the same asset
DISPATCH_WEBHOOK_URL = "https://example-dispatch.local/webhook/emergency"  # swap for real endpoint


@dataclass
class EmergencyCase:
    case_id: str
    asset_id: str
    fault_code: str
    operator: str
    session_id: str
    started_at: float = field(default_factory=time.time)
    resolved: bool = False
    resolution: Optional[str] = None  # "OVERRIDE" | "DISPATCH" | "AUTO_DISPATCH"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    _task: Optional[asyncio.Task] = field(default=None, repr=False)

    def seconds_remaining(self) -> int:
        elapsed = time.time() - self.started_at
        return max(0, int(COUNTDOWN_SECONDS - elapsed))


class EmergencyManager:
    def __init__(self) -> None:
        self._cases: Dict[str, EmergencyCase] = {}
        self._cooldown_until: Dict[str, float] = {}

    def in_cooldown(self, asset_id: str) -> bool:
        until = self._cooldown_until.get(asset_id)
        return until is not None and time.time() < until

    def _start_cooldown(self, asset_id: str) -> None:
        self._cooldown_until[asset_id] = time.time() + COOLDOWN_SECONDS

    def open_case(
        self,
        case_id: str,
        asset_id: str,
        fault_code: str,
        operator: str,
        session_id: str,
        on_auto_dispatch: Callable[[EmergencyCase], Awaitable[None]],
    ) -> EmergencyCase:
        case = EmergencyCase(
            case_id=case_id,
            asset_id=asset_id,
            fault_code=fault_code,
            operator=operator,
            session_id=session_id,
        )
        self._cases[case_id] = case
        log_event(operator, session_id, "EMERGENCY_TRIGGERED",
                  detail=f"asset={asset_id} fault={fault_code} case={case_id}")

        async def _watchdog() -> None:
            await asyncio.sleep(COUNTDOWN_SECONDS)
            if not case.resolved:
                case.resolved = True
                case.resolution = "AUTO_DISPATCH"
                self._start_cooldown(case.asset_id)
                await on_auto_dispatch(case)

        case._task = asyncio.create_task(_watchdog())
        return case

    def get(self, case_id: str) -> Optional[EmergencyCase]:
        return self._cases.get(case_id)

    def override_false_alarm(self, case_id: str, username: str) -> bool:
        # NOTE: no password re-check here on purpose — the operator is already
        # logged in, and the goal is to let anyone dismiss a false alarm fast.
        case = self._cases.get(case_id)
        if not case or case.resolved:
            return False
        case.resolved = True
        case.resolution = "OVERRIDE"
        if case._task:
            case._task.cancel()
        self._start_cooldown(case.asset_id)
        log_event(username, case.session_id, "FALSE_ALARM_OVERRIDE",
                  detail=f"case={case_id} asset={case.asset_id}")
        return True

    def immediate_dispatch(self, case_id: str, operator: str) -> bool:
        case = self._cases.get(case_id)
        if not case or case.resolved:
            return False
        case.resolved = True
        case.resolution = "DISPATCH"
        if case._task:
            case._task.cancel()
        self._start_cooldown(case.asset_id)
        log_event(operator, case.session_id, "IMMEDIATE_DISPATCH",
                  detail=f"case={case_id} asset={case.asset_id}")
        return True


async def dispatch_webhook(payload: EmergencyDispatchPayload) -> dict:
    """
    Simulates an external emergency-services dispatch call. Swap
    DISPATCH_WEBHOOK_URL for a real CAD/PagerDuty/Twilio integration endpoint —
    the payload shape below is already what such an integration would expect.
    """
    body = payload.model_dump(mode="json")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(DISPATCH_WEBHOOK_URL, json=body)
            status = resp.status_code
    except Exception as exc:  # noqa: BLE001 — network is mocked/unreachable in this scaffold
        status = None
        log_event("SYSTEM", "n/a", "AUTO_DISPATCH",
                  detail=f"webhook unreachable ({exc}); payload logged locally: {body}")
    return {"payload": body, "http_status": status}


manager = EmergencyManager()
