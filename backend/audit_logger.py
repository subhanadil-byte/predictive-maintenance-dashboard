"""
Audit ledger: every operator action gets appended as one row to
logs/audit_ledger.csv. Thread-safe via a module-level lock so concurrent
WebSocket + REST handlers can't interleave writes and corrupt rows.
"""
from __future__ import annotations

import csv
import os
import threading
from datetime import datetime, timezone
from typing import List

from models import AuditEvent

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
LEDGER_PATH = os.path.join(LOG_DIR, "audit_ledger.csv")

_lock = threading.Lock()
_FIELDS = ["timestamp", "operator", "session_id", "event_type", "detail"]


def _ensure_ledger() -> None:
    os.makedirs(LOG_DIR, exist_ok=True)
    if not os.path.exists(LEDGER_PATH):
        with open(LEDGER_PATH, "w", newline="") as f:
            csv.DictWriter(f, fieldnames=_FIELDS).writeheader()


def log_event(operator: str, session_id: str, event_type: str, detail: str = "") -> AuditEvent:
    _ensure_ledger()
    event = AuditEvent(
        timestamp=datetime.now(timezone.utc),
        operator=operator,
        session_id=session_id,
        event_type=event_type,  # type: ignore[arg-type]
        detail=detail,
    )
    with _lock:
        with open(LEDGER_PATH, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=_FIELDS)
            writer.writerow({
                "timestamp": event.timestamp.isoformat(),
                "operator": event.operator,
                "session_id": event.session_id,
                "event_type": event.event_type,
                "detail": event.detail,
            })
    return event


def read_ledger(limit: int = 200) -> List[dict]:
    _ensure_ledger()
    with _lock:
        with open(LEDGER_PATH, "r", newline="") as f:
            rows = list(csv.DictReader(f))
    return rows[-limit:][::-1]  # most recent first
