import { motion } from "framer-motion";
import { Activity, BrainCircuit, ScrollText, UserCircle2, BookOpen } from "lucide-react";
import { NAV_TABS } from "../constants/labels.js";
import { playTabBuzz } from "../utils/sounds.js";

const ICONS = {
  telemetry: Activity,
  copilot: BrainCircuit,
  audit: ScrollText,
  operator: UserCircle2,
  docs: BookOpen,
};

export default function NavTabs({ active, onChange }) {
  const handleClick = (id) => {
    playTabBuzz(); // short "zz" buzz + vibration (on supported devices) for every tab click
    onChange(id);
  };

  return (
    <nav className="flex gap-1 p-1 glass-card w-fit">
      {NAV_TABS.map(({ id, label }) => {
        const Icon = ICONS[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono tracking-wide transition-colors
              ${isActive ? "text-ink font-semibold" : "text-cyan-glow/70 hover:text-ink"}`}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-pill"
                className="absolute inset-0 bg-cyan-core rounded-lg shadow-glow-cyan"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}
            <Icon size={14} className="relative z-10" />
            <span className="relative z-10 hidden md:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
