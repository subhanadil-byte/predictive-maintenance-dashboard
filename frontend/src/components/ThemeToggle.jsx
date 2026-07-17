import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === "light";
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark/light theme"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-edge/30 bg-panel/40 text-cyan-glow hover:border-cyan-glow/60 transition-colors"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
