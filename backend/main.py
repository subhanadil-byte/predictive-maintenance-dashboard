"""
AEGIS backend — FastAPI entry point.

Wires together: auth -> audit ledger -> telemetry WS gateway -> ML detector
-> RAG linker -> LLM copilot -> emergency escalation state machine.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

import auth
import audit_logger
import emergency
from ml_engine import registry as detector_registry, severity_from_score
from rag_engine import manual_index
from llm_copilot import generate_briefing
from telemetry_simulator import get_simulator
from laptop_monitor import get_laptop_monitor
from models import (
    LoginRequest, LoginResponse, AnomalyResult,
    EmergencyOverrideRequest, EmergencyDispatchPayload,
)

app = FastAPI(title="AEGIS Predictive Maintenance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_current_operator(token: str = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token")
    payload = auth.decode_session_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return payload


# ---------------------------------------------------------------- Auth ----

@app.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    operator = auth.authenticate_operator(req.username, req.password)
    if not operator:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    session_id = auth.new_session_id()
    token = auth.create_session_token(req.username, session_id)
    audit_logger.log_event(req.username, session_id, "LOGIN", detail="Operator authenticated")
    return LoginResponse(
        access_token=token,
        operator_name=operator["name"],
        role=operator["role"],
        session_id=session_id,
    )


@app.post("/auth/logout")
def logout(session_id: str, current=Depends(get_current_operator)):
    audit_logger.log_event(current["sub"], session_id, "LOGOUT", detail="Operator signed out")
    return {"status": "ok"}


# --------------------------------------------------------------- Audit ----

@app.get("/audit/ledger")
def get_ledger(limit: int = 200, current=Depends(get_current_operator)):
    return audit_logger.read_ledger(limit=limit)


@app.post("/audit/event")
def post_event(session_id: str, event_type: str, detail: str = "", current=Depends(get_current_operator)):
    event = audit_logger.log_event(current["sub"], session_id, event_type, detail)
    return event


# ---------------------------------------------------------- Emergency -----

async def _handle_auto_dispatch(case: emergency.EmergencyCase) -> None:
    payload = EmergencyDispatchPayload(
        asset_id=case.asset_id,
        fault_code=case.fault_code,
        latitude=case.latitude,
        longitude=case.longitude,
        triggered_at=datetime.now(timezone.utc),
        operator=case.operator,
    )
    audit_logger.log_event(case.operator, case.session_id, "AUTO_DISPATCH",
                           detail=f"case={case.case_id} no operator response within countdown")
    await emergency.dispatch_webhook(payload)


@app.post("/emergency/override")
def emergency_override(req: EmergencyOverrideRequest, case_id: str, current=Depends(get_current_operator)):
    ok = emergency.manager.override_false_alarm(case_id, current["sub"])
    if not ok:
        raise HTTPException(status_code=400, detail="Override failed: case not found or already resolved")
    return {"status": "overridden"}


@app.post("/emergency/dispatch")
def emergency_dispatch(case_id: str, current=Depends(get_current_operator)):
    ok = emergency.manager.immediate_dispatch(case_id, current["sub"])
    if not ok:
        raise HTTPException(status_code=400, detail="Dispatch failed: case not found or already resolved")
    return {"status": "dispatched"}


@app.get("/emergency/{case_id}/status")
def emergency_status(case_id: str):
    case = emergency.manager.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "case_id": case.case_id,
        "resolved": case.resolved,
        "resolution": case.resolution,
        "seconds_remaining": case.seconds_remaining(),
    }


# --------------------------------------------------------- Telemetry WS ----

@app.websocket("/ws/telemetry/{asset_id}")
async def telemetry_ws(
    websocket: WebSocket, asset_id: str, session_id: str, operator: str, source: str = "simulated"
):
    """
    Streams telemetry @ ~2Hz for one asset, running each tick through the
    anomaly detector. `source` is "simulated" (fake industrial machine, the
    default) or "laptop" (real stats from this computer, see
    laptop_monitor.py) — controlled live by the toggle in the dashboard, no
    restart needed. On CATASTROPHIC severity, opens an EmergencyCase and
    pushes an `emergency.trigger` event; on lesser anomalies, pushes an
    `anomaly.detected` event with a generated maintenance briefing.
    """
    await websocket.accept()
    simulator = get_simulator(asset_id)
    laptop_monitor = get_laptop_monitor(asset_id)
    detector = detector_registry.get(asset_id)
    active_case_id: str | None = None
    tick_count = 0
    SNAPSHOT_EVERY_N_TICKS = 60  # ~30s at the 2Hz tick rate below

    try:
        while True:
            reading = laptop_monitor.next_reading() if source == "laptop" else simulator.next_reading()
            score, is_anomaly, fault_code, contributing = detector.score(reading.features)
            severity = severity_from_score(score, reading.features)
            tick_count += 1

            await websocket.send_json({
                "type": "telemetry.tick",
                "data": reading.model_dump(mode="json"),
            })

            # Log a routine status snapshot periodically, even when everything
            # is nominal — so the audit trail reflects normal operation too,
            # not only faults.
            if tick_count % SNAPSHOT_EVERY_N_TICKS == 0 and not is_anomaly:
                summary = ", ".join(f"{k}={v}" for k, v in list(reading.features.items())[:4])
                audit_logger.log_event(
                    operator, session_id, "STATUS_SNAPSHOT",
                    detail=f"asset={asset_id} severity={severity} {summary}",
                )

            if is_anomaly:
                anomaly = AnomalyResult(
                    asset_id=asset_id,
                    timestamp=reading.timestamp,
                    anomaly_score=score,
                    is_anomaly=True,
                    severity=severity,
                    fault_code=fault_code,
                    contributing_features=contributing,
                )
                audit_logger.log_event(
                    operator, session_id, "ANOMALY_WITNESSED",
                    detail=f"asset={asset_id} severity={severity} fault={fault_code} score={score}",
                )

                if (
                    severity == "CATASTROPHIC"
                    and active_case_id is None
                    and not emergency.manager.in_cooldown(asset_id)
                ):
                    case_id = str(uuid.uuid4())
                    active_case_id = case_id
                    emergency.manager.open_case(
                        case_id, asset_id, fault_code or "ERR_UNCLASSIFIED_ANOMALY",
                        operator, session_id, on_auto_dispatch=_handle_auto_dispatch,
                    )
                    await websocket.send_json({
                        "type": "emergency.trigger",
                        "data": {
                            "case_id": case_id,
                            "asset_id": asset_id,
                            "fault_code": fault_code,
                            "countdown_seconds": emergency.COUNTDOWN_SECONDS,
                        },
                    })
                elif fault_code:
                    manuals = manual_index.retrieve(fault_code, reading.features)
                    context = laptop_monitor.get_top_processes() if source == "laptop" else None
                    briefing = generate_briefing(anomaly, manuals, context)
                    await websocket.send_json({
                        "type": "anomaly.detected",
                        "data": {
                            "anomaly": anomaly.model_dump(mode="json"),
                            "briefing": briefing.model_dump(mode="json"),
                        },
                    })

            if active_case_id is not None:
                case = emergency.manager.get(active_case_id)
                if case and case.resolved:
                    await websocket.send_json({
                        "type": "emergency.resolved",
                        "data": {"case_id": active_case_id, "resolution": case.resolution},
                    })
                    active_case_id = None

            await asyncio.sleep(0.5)  # ~2Hz
    except WebSocketDisconnect:
        return


@app.get("/health")
def health():
    return {"status": "ok"}
