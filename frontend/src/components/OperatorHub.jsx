import GlassCard from "./GlassCard.jsx";
import { UserCircle2, Fingerprint, ShieldCheck, LogOut, Mail, RotateCcw, Clock, Building2 } from "lucide-react";
import { POLICY_TEXT, SUPPORT_EMAIL, ASSET_ID, FORCE_RESTART_TEXT, getAssetDisplayName } from "../constants/labels.js";

export default function OperatorHub({ session, onLogout, onForceRestart, telemetrySource }) {
  const assetLabel = getAssetDisplayName(telemetrySource);
  const reportIssueHref =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(`AEGIS Issue Report — ${ASSET_ID}`)}` +
    `&body=${encodeURIComponent(
      `Operator: ${session.operatorName} (${session.username})\n` +
      `Asset: ${assetLabel}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `Describe the issue here:\n`
    )}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <GlassCard eyebrow="Identity" title="Operator Profile">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-cyan-core/20 border border-cyan-glow/40 flex items-center justify-center">
            <UserCircle2 size={26} className="text-cyan-glow" />
          </div>
          <div>
            <div className="text-ink font-display">{session.operatorName}</div>
            <div className="hud-label">{session.role}</div>
          </div>
        </div>
        <div className="space-y-2 text-xs font-mono text-ink/70">
          <div className="flex items-center gap-2"><Fingerprint size={13} className="text-cyan-glow/60" /> Session ID: {session.sessionId}</div>
          <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-cyan-glow/60" /> Login ID: {session.username}</div>
          <div className="flex items-center gap-2"><Building2 size={13} className="text-cyan-glow/60" /> Assigned asset: {assetLabel}</div>
          <div className="flex items-center gap-2"><Clock size={13} className="text-cyan-glow/60" /> Session started: {new Date().toLocaleString()}</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs font-mono text-crimson-critical border border-crimson-critical/40 rounded-lg px-3 py-2 hover:bg-crimson-critical/10"
          >
            <LogOut size={13} /> Terminate Session
          </button>
          <button
            onClick={onForceRestart}
            className="flex items-center gap-2 text-xs font-mono text-amber-alert border border-amber-alert/40 rounded-lg px-3 py-2 hover:bg-amber-alert/10"
          >
            <RotateCcw size={13} /> {FORCE_RESTART_TEXT.buttonLabel}
          </button>
          <a
            href={reportIssueHref}
            className="flex items-center gap-2 text-xs font-mono text-cyan-glow border border-cyan-glow/40 rounded-lg px-3 py-2 hover:bg-cyan-glow/10"
          >
            <Mail size={13} /> Report an Issue
          </a>
        </div>
      </GlassCard>

      <GlassCard eyebrow="Access Policy" title="System Policy & Permissions">
        <ul className="text-sm text-ink/70 space-y-2.5 list-disc list-inside marker:text-cyan-glow/60">
          {POLICY_TEXT.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
