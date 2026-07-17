# AEGIS - Real-Time Predictive Maintenance Dashboard
**Live Project Link:** [Click Here to Open Dashboard](https://predictive-maintenance-dashboard-one.vercel.app)

**Demo Login Credentials (for instant access):**
* **Username:** `SUBHAN`
* **Password:** `12341234`
**Important Note on Dashboard Modes:**
* **Simulated Mode (Recommended for Instant Demo):** Click this to instantly watch real-time mathematical telemetry streaming for an industrial pump. No setup required!
* **"This Laptop" Mode (Local Hardware Monitoring):** To see your own laptop's real-time CPU/Memory metrics on this live dashboard, security protocols require you to run the Python backend locally. Simply clone this repo and start the backend using `uvicorn main:app --reload`. The live Vercel frontend will automatically securely latch onto your local hardware agent.

---
---
A production-grade blueprint for an industrial IoT digital-twin dashboard: real-time
telemetry, a hybrid ML + RAG + LLM diagnostics pipeline, an audited operator login
system, and an autonomous high-risk emergency escalation flow.

This is a **working scaffold**, not a toy demo — the ML detector is a real
`IsolationForest`, the audit ledger is a real CSV writer, the WebSocket telemetry
feed is real, and the RAG layer is a real (if small/local) vector index. The only
thing mocked is the *external* LLM call and the *external* fire-department webhook,
since those need your own API key / dispatch integration to be real — both are
built with a single swap-in point clearly marked in the code.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                   FIELD LAYER                                        │
│   Vibration (X/Y/Z) │ Core Temp │ Va/Vb/Vc │ Load Current │ Noise Floor / SNR         │
│   (Real deployment: OPC-UA / MQTT / Modbus gateways. This scaffold: physics-based     │
│    telemetry_simulator.py generates realistic multi-axis signals + injected faults)  │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         │ async stream (asyncio queue)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              INGESTION / WEBSOCKET GATEWAY                            │
│   FastAPI  ws://.../ws/telemetry/{asset_id}   — pushes ticks @ 2Hz to the UI          │
│   Every tick is also fanned out into the ML pipeline (server-side, non-blocking)      │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1 · THE DETECTOR  (ml_engine.py)                             │
│   sklearn IsolationForest, fit on a rolling window, schema-agnostic:                  │
│   any {feature_name: float} dict is accepted — features are inferred, not hardcoded   │
│   Output: anomaly_score, is_anomaly(bool), triggered_fault_code                       │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         │ on is_anomaly == True
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│              PHASE 2 · THE RAG KNOWLEDGE LINKER  (rag_engine.py)                      │
│   fault_code ──► TF-IDF / cosine-sim retrieval over a local manual-chunk index        │
│   (drop-in swap: replace TfidfVectorizer index with Chroma/Pinecone/pgvector)         │
│   Output: top-k manual excerpts + component metadata                                  │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│              PHASE 3 · THE GEN-AI COPILOT  (llm_copilot.py)                           │
│   Prompt = anomaly vector + fault code + retrieved manual excerpts                    │
│   ──► LLM (swap-in: Anthropic Messages API, model="claude-sonnet-4-6")                │
│   Output: structured 3-step maintenance briefing + auto-filled work order JSON        │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│           PHASE 4 · AUTONOMOUS SAFE-STATE ESCALATION  (emergency.py)                  │
│   if severity == CATASTROPHIC:                                                       │
│     → simulate hardware power-cutoff flag                                            │
│     → push `emergency.trigger` over WS → UI renders full-screen HUD, 05:00 countdown  │
│     → operator: [FALSE ALARM OVERRIDE (password re-auth)] or [IMMEDIATE DISPATCH]     │
│     → countdown = 0 with no action → geolocation payload → dispatch webhook (mocked)  │
└───────────────────────────────────────┬────────────────────────────────────────────--┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                       AUDIT LEDGER  (audit_logger.py)                                 │
│   Every login, logout, tab switch, anomaly witnessed, override, dispatch event is     │
│   appended as a row to logs/audit_ledger.csv  (thread-safe append, atomic flush)      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │ REST + WS
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (React)                                    │
│  LoginScreen → DashboardShell (tab router)                                           │
│    ├─ TelemetryPanel   — live multi-axis charts (recharts) + canvas waveform          │
│    ├─ AICopilotPanel   — fault feed, RAG excerpts, generated briefing, work order     │
│    ├─ AuditLogPanel    — live audit ledger table                                      │
│    ├─ OperatorHub      — session info, roles                                          │
│    └─ EmergencyHUD     — full-screen overlay, countdown, override / dispatch buttons  │
│  Styling: Tailwind, glassmorphism, Framer Motion transitions                          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Repo layout

```
predictive-maintenance-dashboard/
├── backend/
│   ├── main.py                # FastAPI app, routes, WS endpoint, orchestration
│   ├── auth.py                 # login, JWT session, password hashing
│   ├── audit_logger.py         # thread-safe CSV ledger writer/reader
│   ├── models.py               # Pydantic schemas
│   ├── ml_engine.py             # IsolationForest anomaly detector (schema-agnostic)
│   ├── rag_engine.py            # TF-IDF manual retrieval (swap-in for real vector DB)
│   ├── llm_copilot.py           # prompt builder + LLM call (mock fallback included)
│   ├── emergency.py             # safe-state + escalation state machine
│   ├── telemetry_simulator.py   # physics-flavored multi-asset signal generator
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   └── useTelemetryStream.js
        └── components/
            ├── LoginScreen.jsx
            ├── DashboardShell.jsx
            ├── NavTabs.jsx
            ├── GlassCard.jsx
            ├── TelemetryPanel.jsx
            ├── AICopilotPanel.jsx
            ├── AuditLogPanel.jsx
            ├── OperatorHub.jsx
            └── EmergencyHUD.jsx
```

---

## 3. Run it

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Demo operator credentials (seeded on first run): `operator1 / AegisOps!2026`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Set `VITE_API_URL=http://localhost:8000` and `VITE_WS_URL=ws://localhost:8000` in a `.env` file if you change the backend port.

Demo login: **SUBHAN / 12341234** (edit in `backend/auth.py` and `frontend/src/constants/labels.js`)

### Wiring in a real LLM
In `backend/llm_copilot.py`, replace the `_mock_llm_call()` body with a real
Anthropic Messages API call — the function signature, prompt assembly, and
downstream JSON contract are already built to match `claude-sonnet-4-6`'s output
shape, so nothing else in the pipeline needs to change.

### Wiring in a real dispatch webhook
In `backend/emergency.py`, `_dispatch_webhook()` currently logs the payload. Point
`DISPATCH_WEBHOOK_URL` at your real fire/rescue integration endpoint (e.g. a
Twilio/PagerDuty/CAD system webhook) and it will POST the same geolocation +
asset payload there instead.
