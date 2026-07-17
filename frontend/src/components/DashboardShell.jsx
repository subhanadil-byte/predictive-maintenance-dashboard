import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NavTabs from "./NavTabs.jsx";
import TelemetryPanel from "./TelemetryPanel.jsx";
import AICopilotPanel from "./AICopilotPanel.jsx";
import AuditLogPanel from "./AuditLogPanel.jsx";
import OperatorHub from "./OperatorHub.jsx";
import EmergencyHUD from "./EmergencyHUD.jsx";
import ManualDocs from "./ManualDocs.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import TelemetrySourceToggle from "./TelemetrySourceToggle.jsx";
import { useTelemetryStream } from "../hooks/useTelemetryStream.js";
import { getChartConfigs } from "../constants/telemetryConfig.js";
import { ShieldCheck, LogOut, RotateCcw } from "lucide-react";
import { ASSET_ID, HEADER_TEXT, FORCE_RESTART_TEXT, getAssetDisplayName } from "../constants/labels.js";

export default function DashboardShell({ session, apiUrl, onLogout, theme, onToggleTheme }) {
  const [tab, setTab] = useState("telemetry");
  const [telemetrySource, setTelemetrySource] = useState("simulated"); // "simulated" | "laptop"
  const { history, anomalies, emergencyCase, setEmergencyCase, connected } =
    useTelemetryStream(ASSET_ID, session, telemetrySource);
  const latest = history[history.length - 1];
  const chartConfigs = getChartConfigs(telemetrySource);

  const handleForceRestart = async () => {
    if (!window.confirm(FORCE_RESTART_TEXT.confirmMessage)) return;
    try {
      await fetch(
        `${apiUrl}/audit/event?session_id=${session.sessionId}&event_type=FORCE_RESTART&detail=${encodeURIComponent("Operator triggered a force restart")}`,
        { method: "POST", headers: { Authorization: `Bearer ${session.token}` } }
      );
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-void px-6 py-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="hud-label flex items-center gap-1"><ShieldCheck size={12}/> {HEADER_TEXT.eyebrow}</div>
          <h1 className="font-display text-2xl text-ink tracking-wide">
            {getAssetDisplayName(telemetrySource)} <span className="text-cyan-glow/60 text-base">— {HEADER_TEXT.subtitle}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <TelemetrySourceToggle source={telemetrySource} onChange={setTelemetrySource} />
          <div className="text-right hud-label">
            Operator <span className="text-ink">{session.operatorName}</span>
          </div>
          <button
            onClick={handleForceRestart}
            title={FORCE_RESTART_TEXT.buttonLabel}
            aria-label={FORCE_RESTART_TEXT.buttonLabel}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-edge/30 bg-panel/40 text-amber-alert hover:border-amber-alert/60 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            onClick={onLogout}
            title="Log off"
            aria-label="Log off"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-edge/30 bg-panel/40 text-crimson-critical hover:border-crimson-critical/60 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="mb-6">
        <NavTabs active={tab} onChange={setTab} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "telemetry" && <TelemetryPanel history={history} connected={connected} chartConfigs={chartConfigs} />}
          {tab === "copilot" && <AICopilotPanel anomalies={anomalies} latest={latest} chartConfigs={chartConfigs} />}
          {tab === "audit" && <AuditLogPanel session={session} apiUrl={apiUrl} />}
          {tab === "operator" && (
            <OperatorHub session={session} onLogout={onLogout} apiUrl={apiUrl} onForceRestart={handleForceRestart} telemetrySource={telemetrySource} />
          )}
          {tab === "docs" && <ManualDocs />}
        </motion.div>
      </AnimatePresence>

      <EmergencyHUD
        emergencyCase={emergencyCase}
        session={session}
        apiUrl={apiUrl}
        onResolved={() => setEmergencyCase(null)}
      />
    </div>
  );
}
