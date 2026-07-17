import { Factory, Laptop } from "lucide-react";

/**
 * Lets the operator switch, live, between:
 *   - "simulated": the fake industrial-machine data (default)
 *   - "laptop": real CPU/memory/disk/battery stats from this computer
 * No backend restart, no .env files — just a click, same as the theme toggle.
 */
export default function TelemetrySourceToggle({ source, onChange }) {
  const isLaptop = source === "laptop";

  return (
    <div className="flex items-center gap-1 p-1 glass-card">
      <button
        onClick={() => onChange("simulated")}
        title="Simulated industrial machine"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors
          ${!isLaptop ? "bg-cyan-core text-ink shadow-glow-cyan" : "text-cyan-glow/70 hover:text-ink"}`}
      >
        <Factory size={13} /> Simulated
      </button>
      <button
        onClick={() => onChange("laptop")}
        title="This laptop's real stats"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors
          ${isLaptop ? "bg-cyan-core text-ink shadow-glow-cyan" : "text-cyan-glow/70 hover:text-ink"}`}
      >
        <Laptop size={13} /> This Laptop
      </button>
    </div>
  );
}
