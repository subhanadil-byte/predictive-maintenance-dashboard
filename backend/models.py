"""
Shared Pydantic schemas for the AEGIS predictive maintenance backend.
Kept schema-agnostic on purpose: TelemetryReading.features is an open dict so
the same pipeline works for any machine type (pump, turbine, CNC, compressor...).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    operator_name: str
    role: str
    session_id: str


class TelemetryReading(BaseModel):
    asset_id: str
    timestamp: datetime
    features: Dict[str, float] = Field(
        description="Schema-agnostic sensor payload, e.g. "
        "{'vib_x': 0.12, 'vib_y': 0.09, 'core_temp_c': 71.2, 'v_a': 411.2, ...}"
    )


class AnomalyResult(BaseModel):
    asset_id: str
    timestamp: datetime
    anomaly_score: float
    is_anomaly: bool
    severity: Literal["NOMINAL", "WATCH", "WARNING", "CATASTROPHIC"]
    fault_code: Optional[str] = None
    contributing_features: List[str] = []


class ManualExcerpt(BaseModel):
    doc_id: str
    title: str
    excerpt: str
    relevance: float


class MaintenanceBriefing(BaseModel):
    fault_code: str
    summary: str
    steps: List[str]
    work_order: Dict[str, Any]
    referenced_manuals: List[ManualExcerpt]


class AuditEvent(BaseModel):
    timestamp: datetime
    operator: str
    session_id: str
    event_type: Literal[
        "LOGIN", "LOGOUT", "TAB_SWITCH", "ANOMALY_WITNESSED",
        "EMERGENCY_TRIGGERED", "FALSE_ALARM_OVERRIDE", "IMMEDIATE_DISPATCH",
        "AUTO_DISPATCH", "STATUS_SNAPSHOT", "FORCE_RESTART",
    ]
    detail: str = ""


class EmergencyOverrideRequest(BaseModel):
    session_id: str


class EmergencyDispatchPayload(BaseModel):
    asset_id: str
    fault_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    triggered_at: datetime
    operator: str
