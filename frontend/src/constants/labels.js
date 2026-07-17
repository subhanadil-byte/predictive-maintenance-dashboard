/**
 * ============================================================
 *  ALL EDITABLE TEXT LIVES HERE.
 *  Want to change a heading, button label, or demo credential?
 *  Change it in this one file — you don't need to hunt through
 *  every component.
 * ============================================================
 */

// The machine/asset this dashboard is monitoring.
// This is the technical connection ID (stays the same regardless of mode).
export const ASSET_ID = "PUMP-STATION-01";

// What to actually DISPLAY in the header/profile, depending on which
// telemetry source is currently selected (see TelemetrySourceToggle).
export function getAssetDisplayName(telemetrySource) {
  return telemetrySource === "laptop" ? "This Device" : "PUMP-STATION-01";
}

// Demo login credentials (must match backend/auth.py OPERATOR_DB).
export const DEMO_USERNAME = "SUBHAN";
export const DEMO_PASSWORD = "12341234";

export const LOGIN_TEXT = {
  title: "Login",
  usernameLabel: "Username",
  usernamePlaceholder: "Username",
  passwordLabel: "Password",
  passwordPlaceholder: "**********",
  loginButton: "Login",
  forgotPassword: "Forgot password?",
  authenticating: "Logging in…",
  accessDeniedPrefix: "Login failed —",
};

export const NAV_TABS = [
  { id: "telemetry", label: "Live Telemetry" },
  { id: "copilot", label: "AI Diagnosis Copilot" },
  { id: "audit", label: "System Log Matrix" },
  { id: "operator", label: "Operator Hub" },
  { id: "docs", label: "Manual / Help Docs" },
];

export const HEADER_TEXT = {
  eyebrow: "AEGIS",
  subtitle: "Predictive Diagnostics",
};

export const EMERGENCY_TEXT = {
  title: "CRITICAL SAFE-STATE TRIGGERED",
  countdownLabel: "Auto-Dispatch Countdown",
  dismissButton: "DISMISS: FALSE ALARM",
  dispatchButton: "IMMEDIATE DISPATCH",
};

// Where "Report an Issue" emails get sent — change to your real support inbox.
export const SUPPORT_EMAIL = "support@aegis-systems.example";

export const FORCE_RESTART_TEXT = {
  buttonLabel: "Force Restart",
  confirmMessage:
    "This will reload the dashboard and reconnect to live telemetry. Any unsaved on-screen state will be lost. Continue?",
};

export const POLICY_TEXT = [
  "Operators may view live telemetry across every connected asset on this site license, and may open the full historical audit ledger at any time.",
  "Only the operator who is currently logged in may acknowledge, dismiss, or escalate an emergency case raised under their session.",
  "False-alarm dismissals and immediate-dispatch actions are permanent once submitted and are recorded in the audit ledger with the acting operator's identity and a timestamp.",
  "Force-restarting the dashboard reconnects the live telemetry stream but does not affect the underlying machine or any in-progress maintenance work order.",
  "Suspected security incidents, repeated false triggers, or sensor malfunctions should be reported immediately via the \"Report an Issue\" action in the Operator Hub.",
];

export const DOCS_SECTIONS = [
  {
    heading: "What this system does",
    body:
      "AEGIS continuously watches live sensor data from the machine (vibration, temperature, electrical load, and acoustic signal) and automatically flags patterns that don't match normal operation. When something looks off, it explains what's likely wrong in plain English, points to the relevant technical manual section, and drafts a maintenance work order — before the problem becomes a breakdown.",
  },
  {
    heading: "How the detection works",
    body:
      "A machine-learning model (Isolation Forest) builds a picture of what \"normal\" looks like for this asset from its recent readings, then scores every new reading against that baseline. Readings that fall far outside the normal range are flagged as anomalies with a severity level: Nominal, Watch, Warning, or Catastrophic.",
  },
  {
    heading: "How the AI diagnosis works",
    body:
      "Once an anomaly is flagged, the system looks up the closest-matching sections from the equipment's technical manuals (this is the \"RAG\" retrieval step), then hands the anomaly details and those manual excerpts to a generative AI model. The AI writes a short, plain-English explanation and a 3-step repair plan, and auto-fills a work order with a suggested priority and estimated downtime.",
  },
  {
    heading: "The 5 tabs, explained",
    body:
      "Live Telemetry shows real-time charts for every monitored signal — click any card to see it full-size with running min/max/average stats. AI Diagnosis Copilot shows the current reading for every signal plus AI-written briefings whenever a fault is detected. System Log Matrix is the full audit trail: logins, normal status snapshots, faults, and emergency actions. Operator Hub has your profile, system policy, and quick actions like Force Restart and Report an Issue. This tab covers how everything fits together.",
  },
  {
    heading: "Emergency safe-state alerts",
    body:
      "If a reading crosses a catastrophic threshold, the dashboard raises a full-screen alert with a 5-minute countdown. An operator can dismiss it as a false alarm or trigger immediate dispatch; if nobody responds before the countdown ends, the system automatically escalates as though dispatching emergency services, and every step is written to the audit ledger.",
  },
  {
    heading: "Force Restart & Report an Issue",
    body:
      "Force Restart reloads the dashboard and reconnects the live telemetry stream — useful if the connection looks stuck. It does not affect the machine itself. Report an Issue opens an email to the support team with your asset ID and the current time pre-filled, for anything that needs a human to look at.",
  },
];
