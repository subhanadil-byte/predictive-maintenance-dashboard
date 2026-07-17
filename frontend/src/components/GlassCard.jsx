import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", title, eyebrow, glow = "cyan" }) {
  const glowClass = glow === "crimson" ? "shadow-glow-crimson" : "shadow-glow-cyan";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`glass-card p-5 relative overflow-hidden ${glowClass} ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-glow/60 to-transparent" />
      {eyebrow && <div className="hud-label mb-1">{eyebrow}</div>}
      {title && <h3 className="font-display text-ink text-sm mb-3 tracking-wide">{title}</h3>}
      {children}
    </motion.div>
  );
}
