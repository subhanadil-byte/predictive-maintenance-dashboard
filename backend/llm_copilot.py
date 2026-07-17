"""
Phase 3 — The Gen-AI Copilot.

Builds a structured prompt from the anomaly vector + fault code + retrieved
manual excerpts, and turns the model's response into a MaintenanceBriefing
with an auto-filled work order. `_mock_llm_call` is a clearly-marked stand-in
so the scaffold works with zero API keys configured; swap it for a real
Anthropic Messages API call (model="claude-sonnet-4-6") to go live — the
prompt shape and the parsing contract below already match what that call
would need and return.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from models import AnomalyResult, ManualExcerpt, MaintenanceBriefing

SYSTEM_PROMPT = """You are AEGIS Copilot, a plant-floor reliability engineering \
assistant. Given a machine's anomaly telemetry, its inferred fault code, and \
excerpts from the relevant technical manuals, produce a concise, plain-English \
maintenance briefing. Always respond with strict JSON matching this shape:
{
  "summary": "<one sentence, plain English, no jargon overload>",
  "steps": ["<step 1>", "<step 2>", "<step 3>"],
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "estimated_downtime_minutes": <int>
}
Do not include any text outside the JSON object."""


def _build_user_prompt(
    anomaly: AnomalyResult, manuals: List[ManualExcerpt], context: Optional[Dict] = None
) -> str:
    manuals_block = "\n\n".join(
        f"[{m.doc_id}] {m.title}\n{m.excerpt}" for m in manuals
    )
    context_block = ""
    if context:
        top_cpu = context.get("top_cpu_process") or {}
        top_mem = context.get("top_memory_process") or {}
        context_block = f"""
Live process context (real, right now — reference this by name in your advice):
- Top CPU consumer: {top_cpu.get('name') or 'unknown'} ({top_cpu.get('percent', 0)}% CPU)
- Top memory consumer: {top_mem.get('name') or 'unknown'} ({top_mem.get('mb', 0)} MB)
"""
    return f"""Asset: {anomaly.asset_id}
Fault code: {anomaly.fault_code}
Severity: {anomaly.severity}
Anomaly score: {anomaly.anomaly_score}
Contributing signals: {', '.join(anomaly.contributing_features) or 'n/a'}
Timestamp: {anomaly.timestamp.isoformat()}
{context_block}
Relevant manual excerpts:
{manuals_block}

Produce the JSON maintenance briefing now."""


def _mock_llm_call(system_prompt: str, user_prompt: str, fault_code: str, context: Optional[Dict] = None) -> dict:
    """
    STAND-IN ONLY — replace this function body with a real call, e.g.:

        import anthropic
        client = anthropic.Anthropic()
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return json.loads(resp.content[0].text)

    The mock below produces a deterministic, plausible briefing so the rest
    of the pipeline (UI, work order auto-fill) can be built and tested today.
    For the laptop-monitoring fault codes, it personalizes the response with
    the REAL top CPU/memory-consuming process from `context` — a real LLM
    call would do this reasoning itself from the prompt above, but the mock
    does it explicitly here so the demo is genuinely useful without an API key.
    """
    top_cpu = (context or {}).get("top_cpu_process") or {}
    top_mem = (context or {}).get("top_memory_process") or {}

    templates = {
        "ERR_BEARING_FRICTION": {
            "summary": "Bearing lubrication breakdown likely driving elevated vibration and heat.",
            "steps": [
                "De-energize the asset and lock out per LOTO procedure before inspection.",
                "Pull a grease sample from the bearing housing and check for metallic particulate.",
                "Re-lubricate to spec and re-check vibration signature after a 15-minute run-in.",
            ],
            "priority": "HIGH",
            "estimated_downtime_minutes": 90,
        },
        "ERR_VOLT_SPIKE_91": {
            "summary": "Phase voltage transient suggests a loose connection or failing capacitor bank.",
            "steps": [
                "De-energize the affected feeder and verify zero energy state.",
                "Torque-check all lugs on the distribution panel and megger test the capacitor bank.",
                "Re-energize incrementally while monitoring Va/Vb/Vc for transient recurrence.",
            ],
            "priority": "CRITICAL",
            "estimated_downtime_minutes": 60,
        },
        "ERR_THERMAL_OVERLOAD": {
            "summary": "Core temperature exceeding thermal envelope, likely coolant flow restriction.",
            "steps": [
                "Verify coolant pump differential pressure against nameplate spec.",
                "Inspect and clear intake filters and heat exchanger fins of fouling.",
                "Confirm fan bearing is free-spinning and not seized before resuming load.",
            ],
            "priority": "HIGH",
            "estimated_downtime_minutes": 45,
        },
        "ERR_OVERCURRENT_LOAD": {
            "summary": "Sustained overcurrent draw without added mechanical output implies a load-side fault.",
            "steps": [
                "Check motor winding insulation resistance with a megohmmeter.",
                "Inspect the coupled driven load for mechanical obstruction or jam.",
                "Reset overload protection only after confirming free rotation.",
            ],
            "priority": "MEDIUM",
            "estimated_downtime_minutes": 75,
        },
        "ERR_CPU_OVERLOAD": {
            "summary": (
                f"{top_cpu.get('name')} is currently using {top_cpu.get('percent')}% of your CPU — "
                "that's almost certainly what's driving this overload."
                if top_cpu.get("name")
                else "CPU usage has been pinned near maximum, likely a runaway process or thermal throttling."
            ),
            "steps": (
                [
                    f"Open Activity Monitor / Task Manager and check \"{top_cpu.get('name')}\" — it's using {top_cpu.get('percent')}% CPU right now.",
                    f"If you don't need it running, quit \"{top_cpu.get('name')}\" and see if usage drops.",
                    "If it keeps happening with the same app, check for a pending update or a known bug report for it.",
                ]
                if top_cpu.get("name")
                else [
                    "Open Activity Monitor / Task Manager and sort by CPU to find the top consumer.",
                    "Quit or restart the offending process; check for pending OS/app updates known to cause loops.",
                    "Confirm vents/fan aren't obstructed if this coincides with high CPU temperature.",
                ]
            ),
            "priority": "MEDIUM",
            "estimated_downtime_minutes": 10,
        },
        "ERR_MEMORY_PRESSURE": {
            "summary": (
                f"{top_mem.get('name')} is holding about {top_mem.get('mb')} MB of memory — "
                "that's the largest consumer right now and the likely cause of this pressure."
                if top_mem.get("name")
                else "Memory usage is sustained near capacity, risking slowdowns or forced app closures."
            ),
            "steps": (
                [
                    f"Check \"{top_mem.get('name')}\" — it's currently using about {top_mem.get('mb')} MB of RAM.",
                    f"Close unused tabs/windows in \"{top_mem.get('name')}\" or restart it to release memory.",
                    "If its memory use keeps climbing right after a restart, that's a sign of a memory leak — worth reporting to the app's developer.",
                ]
                if top_mem.get("name")
                else [
                    "Close unused applications and browser tabs to free up memory immediately.",
                    "Check Activity Monitor / Task Manager for a single process with abnormally growing memory use.",
                    "Restart the affected application (or the machine) if a memory leak is confirmed.",
                ]
            ),
            "priority": "LOW",
            "estimated_downtime_minutes": 5,
        },
        "ERR_DISK_IO_SATURATION": {
            "summary": "Disk read/write throughput is unusually high and sustained.",
            "steps": [
                "Check for active backups, cloud sync, or search-indexing jobs running in the background.",
                "Pause or reschedule any large file transfers currently in progress.",
                "If throughput stays high with no known cause, run a disk health/SMART check.",
            ],
            "priority": "LOW",
            "estimated_downtime_minutes": 5,
        },
        "ERR_LOW_BATTERY": {
            "summary": "Battery is discharging without a charger connected and is approaching a critical level.",
            "steps": [
                "Connect the device to a power source as soon as possible.",
                "Save any open work to avoid data loss from an unplanned shutdown.",
                "If battery drains unusually fast even when idle, schedule a battery health check.",
            ],
            "priority": "HIGH",
            "estimated_downtime_minutes": 2,
        },
        "ERR_LAPTOP_THERMAL_THROTTLE": {
            "summary": "macOS has reduced CPU speed below 100% to manage heat — the device is actively throttling.",
            "steps": [
                "Move the laptop to a hard, flat surface and make sure the air vents aren't blocked.",
                "Close CPU-heavy apps/tabs to let the system cool down and recover full speed.",
                "If throttling keeps recurring under normal use, check the fan for dust buildup.",
            ],
            "priority": "MEDIUM",
            "estimated_downtime_minutes": 5,
        },
    }
    default = {
        "summary": f"Anomaly pattern associated with {fault_code} detected outside nominal baseline.",
        "steps": [
            "Isolate the asset and confirm sensor readings with a secondary handheld instrument.",
            "Cross-reference the fault code against the linked manual excerpts for root cause.",
            "Schedule a technician inspection before returning the asset to full load.",
        ],
        "priority": "MEDIUM",
        "estimated_downtime_minutes": 60,
    }
    return templates.get(fault_code, default)


def generate_briefing(
    anomaly: AnomalyResult, manuals: List[ManualExcerpt], context: Optional[Dict] = None
) -> MaintenanceBriefing:
    fault_code = anomaly.fault_code or "ERR_UNCLASSIFIED_ANOMALY"
    user_prompt = _build_user_prompt(anomaly, manuals, context)
    result = _mock_llm_call(SYSTEM_PROMPT, user_prompt, fault_code, context)

    work_order = {
        "work_order_id": f"WO-{uuid.uuid4().hex[:8].upper()}",
        "asset_id": anomaly.asset_id,
        "fault_code": fault_code,
        "priority": result.get("priority", "MEDIUM"),
        "estimated_downtime_minutes": result.get("estimated_downtime_minutes", 60),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "OPEN",
        "assigned_team": "Reliability & Maintenance",
    }

    return MaintenanceBriefing(
        fault_code=fault_code,
        summary=result.get("summary", ""),
        steps=result.get("steps", []),
        work_order=work_order,
        referenced_manuals=manuals,
    )
