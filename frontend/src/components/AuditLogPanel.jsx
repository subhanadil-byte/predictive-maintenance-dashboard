import { useEffect, useState } from "react";
import GlassCard from "./GlassCard.jsx";
import { ScrollText, RefreshCw } from "lucide-react";

const EVENT_COLOR = {
  LOGIN: "text-cyan-glow",
  LOGOUT: "text-ink/50",
  ANOMALY_WITNESSED: "text-amber-alert",
  EMERGENCY_TRIGGERED: "text-crimson-critical",
  FALSE_ALARM_OVERRIDE: "text-cyan-glow",
  IMMEDIATE_DISPATCH: "text-crimson-critical",
  AUTO_DISPATCH: "text-crimson-critical",
  TAB_SWITCH: "text-ink/40",
  STATUS_SNAPSHOT: "text-ink/40",
  FORCE_RESTART: "text-amber-alert",
};

export default function AuditLogPanel({ session, apiUrl }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/audit/ledger?limit=100`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <GlassCard eyebrow="Audit Ledger" title="System Log Matrix">
      <div className="flex items-center justify-between mb-3">
        <span className="hud-label flex items-center gap-1"><ScrollText size={12}/> {rows.length} events</span>
        <button onClick={fetchLedger} className="hud-label flex items-center gap-1 hover:text-ink">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> refresh
        </button>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-void/90">
            <tr className="text-cyan-glow/60 text-left">
              <th className="py-1.5 pr-2">Timestamp</th>
              <th className="py-1.5 pr-2">Operator</th>
              <th className="py-1.5 pr-2">Event</th>
              <th className="py-1.5">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-edge/60">
                <td className="py-1.5 pr-2 text-ink/50 whitespace-nowrap">
                  {new Date(r.timestamp).toLocaleString()}
                </td>
                <td className="py-1.5 pr-2 text-ink/80">{r.operator}</td>
                <td className={`py-1.5 pr-2 ${EVENT_COLOR[r.event_type] || "text-ink"}`}>{r.event_type}</td>
                <td className="py-1.5 text-ink/50">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
