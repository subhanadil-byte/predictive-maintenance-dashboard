import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "./GlassCard.jsx";
import { Radio, Waves, X } from "lucide-react";
import { CHART_CONFIGS as DEFAULT_CHART_CONFIGS } from "../constants/telemetryConfig.js";

function computeStats(history, key) {
  const values = history.map((row) => row[key]).filter((v) => typeof v === "number");
  if (values.length === 0) return { latest: null, min: null, max: null, avg: null };
  const latest = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { latest, min, max, avg };
}

function MiniChart({ data, dataKeys, colors, height = 140 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(184,129,255,0.10)" vertical={false} />
        <XAxis dataKey="timestamp" hide />
        <YAxis tick={{ fontSize: 9, fill: "#B881FF99" }} width={36} />
        <Tooltip
          contentStyle={{ background: "#0F091Aee", border: "1px solid #9333EA33", fontSize: 11 }}
          labelFormatter={() => ""}
        />
        {dataKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i]}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function AcousticCanvas({ latest, size = { width: 520, height: 110 } }) {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const snr = latest?.snr_db ?? 38;
      const noise = latest?.noise_floor_db ?? -60;
      const amplitude = Math.min(height / 3, Math.max(6, (noise + 70) * 1.4));
      const freq = Math.max(0.02, 0.08 - snr / 1200);

      ctx.strokeStyle = "#B881FFcc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y =
          height / 2 +
          Math.sin(x * freq + phaseRef.current) * amplitude * Math.sin(x * 0.01 + phaseRef.current * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phaseRef.current += 0.06;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [latest, size]);

  return <canvas ref={canvasRef} width={size.width} height={size.height} className="w-full" style={{ height: size.height }} />;
}

/** Full-size view of one chart, with live running stats, shown when a card is clicked. */
function ExpandedChartModal({ config, history, latest, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-void/90 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel w-full max-w-3xl p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ink/60 hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="hud-label mb-1">{config.eyebrow}</div>
          <h2 className="font-display text-xl text-ink mb-4">{config.title}</h2>

          {config.id === "acoustic" ? (
            <AcousticCanvas latest={latest} size={{ width: 900, height: 240 }} />
          ) : (
            <MiniChart data={history} dataKeys={config.dataKeys} colors={config.colors} height={320} />
          )}

          {/* Running details: current / min / max / average for each signal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {config.dataKeys?.map((key, i) => {
              const stats = computeStats(history, key);
              return (
                <div key={key} className="bg-ink/5 border border-edge/20 rounded-lg p-3">
                  <div className="hud-label mb-1" style={{ color: config.colors[i] }}>
                    {config.labels[i]} {config.unit}
                  </div>
                  <div className="text-ink font-display text-lg">{stats.latest?.toFixed(2) ?? "--"}</div>
                  <div className="text-ink/50 text-xs font-mono mt-1">
                    min {stats.min?.toFixed(2) ?? "--"} · max {stats.max?.toFixed(2) ?? "--"} · avg {stats.avg?.toFixed(2) ?? "--"}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function TelemetryPanel({ history, connected, chartConfigs = DEFAULT_CHART_CONFIGS }) {
  const latest = history[history.length - 1];
  const [expandedId, setExpandedId] = useState(null); // which chart card is currently expanded, if any

  const expandedConfig =
    expandedId === "acoustic"
      ? { id: "acoustic", eyebrow: "Acoustic Telemetry", title: "Real-Time Wave Function" }
      : chartConfigs.find((c) => c.id === expandedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-cyan-glow animate-pulseGlow" : "bg-crimson-critical"}`} />
        <span className="hud-label">Live Telemetry</span>
      </div>

      {chartConfigs.map((config) => (
        <button
          key={config.id}
          onClick={() => setExpandedId(config.id)}
          className="text-left cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <GlassCard eyebrow={config.eyebrow} title={config.title}>
            <MiniChart data={history} dataKeys={config.dataKeys} colors={config.colors} />
            <div className="mt-2 flex justify-between hud-label">
              {config.dataKeys.map((key, i) => (
                <span key={key}>
                  {config.labels[i]} {latest?.[key] ?? "--"}
                  {config.unit}
                </span>
              ))}
            </div>
          </GlassCard>
        </button>
      ))}

      <button
        onClick={() => setExpandedId("acoustic")}
        className="text-left cursor-pointer transition-transform hover:scale-[1.02]"
      >
        <GlassCard eyebrow="Acoustic Telemetry" title="Real-Time Wave Function">
          <div className="flex items-center gap-1 hud-label mb-2"><Waves size={13}/> live waveform (click to expand)</div>
          <AcousticCanvas latest={latest} />
        </GlassCard>
      </button>

      <GlassCard eyebrow="Network" title="Signal Integrity" className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-cyan-glow">
          <Radio size={18} className={connected ? "animate-pulseGlow" : ""} />
          <span className="font-mono text-xs">{connected ? "STREAM NOMINAL @ 2Hz" : "AWAITING RECONNECT"}</span>
        </div>
      </GlassCard>

      {expandedId && (
        <ExpandedChartModal
          config={expandedConfig}
          history={history}
          latest={latest}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}
