import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, Siren, Send } from "lucide-react";
import { EMERGENCY_TEXT } from "../constants/labels.js";

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function EmergencyHUD({ emergencyCase, session, apiUrl, onResolved }) {
  const [remaining, setRemaining] = useState(emergencyCase?.countdown_seconds ?? 300);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!emergencyCase) return;
    setRemaining(emergencyCase.countdown_seconds ?? 300);
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [emergencyCase]);

  if (!emergencyCase) return null;

  // No password check on purpose — dismissing a false alarm needs to be instant.
  const handleDismiss = async () => {
    setBusy(true);
    try {
      await fetch(`${apiUrl}/emergency/override?case_id=${emergencyCase.case_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ session_id: session.sessionId }),
      });
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  const handleDispatch = async () => {
    setBusy(true);
    try {
      await fetch(`${apiUrl}/emergency/dispatch?case_id=${emergencyCase.case_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-void/95 backdrop-blur-md flex items-center justify-center"
      >
        <motion.div
          animate={{ boxShadow: ["0 0 40px rgba(255,59,92,0.3)", "0 0 90px rgba(255,59,92,0.55)", "0 0 40px rgba(255,59,92,0.3)"] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="border-2 border-crimson-critical rounded-2xl p-10 max-w-lg w-full mx-4 bg-void relative"
        >
          <div className="flex items-center gap-3 mb-4 text-crimson-critical">
            <Siren size={28} className="animate-pulseGlow" />
            <span className="font-display text-xl tracking-widest">{EMERGENCY_TEXT.title}</span>
          </div>

          <div className="flex items-center gap-2 text-ink/70 text-sm mb-6">
            <AlertOctagon size={16} className="text-amber-alert" />
            Asset <span className="text-ink font-mono">{emergencyCase.asset_id}</span> reported
            catastrophic limits — fault code
            <span className="text-crimson-critical font-mono"> {emergencyCase.fault_code}</span>.
            Simulated hardware power cutoff engaged.
          </div>

          <div className="text-center mb-8">
            <div className="hud-label mb-1">{EMERGENCY_TEXT.countdownLabel}</div>
            <div className="font-display text-6xl text-crimson-critical tracking-widest tabular-nums">
              {formatCountdown(remaining)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDismiss}
              disabled={busy}
              className="border border-cyan-glow/50 text-cyan-glow rounded-lg py-3 text-sm font-mono hover:bg-cyan-glow/10 disabled:opacity-60"
            >
              {EMERGENCY_TEXT.dismissButton}
            </button>
            <button
              onClick={handleDispatch}
              disabled={busy}
              className="bg-crimson-critical text-white rounded-lg py-3 text-sm font-mono flex items-center justify-center gap-2 hover:bg-crimson-critical/80 disabled:opacity-60"
            >
              <Send size={14} /> {EMERGENCY_TEXT.dispatchButton}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
