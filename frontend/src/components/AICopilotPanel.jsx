import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "./GlassCard.jsx";
import { BrainCircuit, FileText, ClipboardList, AlertTriangle, Activity } from "lucide-react";
import { CHART_CONFIGS as DEFAULT_CHART_CONFIGS } from "../constants/telemetryConfig.js";

const PRIORITY_COLOR = {
  LOW: "text-cyan-glow",
  MEDIUM: "text-amber-alert",
  HIGH: "text-amber-alert",
  CRITICAL: "text-crimson-critical",
};

export default function AICopilotPanel({ anomalies, latest, chartConfigs = DEFAULT_CHART_CONFIGS }) {
  return (
    <div className="space-y-5">
      {/* Always-visible live snapshot of every monitored signal, whether or
          not anything is currently wrong — so this tab isn't blank while
          the system is running normally. */}
      <GlassCard eyebrow="Live Status" title="Current System Status">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {chartConfigs.flatMap((config) =>
            config.dataKeys.map((key, i) => (
              <div key={key} className="bg-ink/5 border border-edge/15 rounded-lg p-3">
                <div className="hud-label mb-1" style={{ color: config.colors[i] }}>
                  {config.labels[i]} {config.unit}
                </div>
                <div className="text-ink font-display text-lg">
                  {latest?.[key] !== undefined ? latest[key] : "--"}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 text-ink/50 text-xs mt-3">
          <Activity size={13} className="text-cyan-glow/60" />
          Updates live every ~0.5s from the connected asset.
        </div>
      </GlassCard>

      {!anomalies.length && (
        <GlassCard eyebrow="AI Diagnosis Copilot" title="No Faults Detected">
          <div className="flex items-center gap-2 text-ink/60 text-sm">
            <BrainCircuit size={16} className="text-cyan-glow/60" />
            Everything above is within its normal operating range. As soon as a
            reading drifts outside baseline, a full AI-written briefing will
            appear here automatically.
          </div>
        </GlassCard>
      )}

      <AnimatePresence initial={false}>
        {anomalies.map((item, idx) => {
          const { anomaly, briefing } = item;
          return (
            <motion.div
              key={`${anomaly.timestamp}-${idx}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard glow={anomaly.severity === "WARNING" ? "crimson" : "cyan"}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="hud-label mb-1">Fault Code · {anomaly.asset_id}</div>
                    <div className="font-display text-lg text-ink flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-alert" />
                      {briefing.fault_code}
                    </div>
                  </div>
                  <div className={`font-mono text-xs px-2 py-1 rounded border border-current ${PRIORITY_COLOR[briefing.work_order.priority] || "text-cyan-glow"}`}>
                    {briefing.work_order.priority} · {anomaly.severity}
                  </div>
                </div>

                <p className="text-sm text-ink/80 mb-4">{briefing.summary}</p>

                <div className="mb-4">
                  <div className="hud-label mb-2 flex items-center gap-1"><BrainCircuit size={12}/> 3-Step Maintenance Briefing</div>
                  <ol className="space-y-1.5">
                    {briefing.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink/85">
                        <span className="text-cyan-glow font-mono">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mb-4">
                  <div className="hud-label mb-2 flex items-center gap-1"><FileText size={12}/> Referenced Manuals (RAG)</div>
                  <div className="grid gap-2">
                    {briefing.referenced_manuals.map((m) => (
                      <div key={m.doc_id} className="bg-ink/5 border border-edge rounded-lg p-2.5">
                        <div className="flex justify-between text-xs font-mono text-cyan-glow/80 mb-1">
                          <span>{m.doc_id}</span>
                          <span>relevance {(m.relevance * 100).toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-ink/60">{m.title}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-ink/5 border border-edge rounded-lg p-3">
                  <div className="hud-label mb-2 flex items-center gap-1"><ClipboardList size={12}/> Auto-Filled Work Order</div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs font-mono text-ink/70">
                    <span>ID</span><span className="text-ink">{briefing.work_order.work_order_id}</span>
                    <span>Team</span><span className="text-ink">{briefing.work_order.assigned_team}</span>
                    <span>Est. Downtime</span><span className="text-ink">{briefing.work_order.estimated_downtime_minutes} min</span>
                    <span>Status</span><span className="text-cyan-glow">{briefing.work_order.status}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
