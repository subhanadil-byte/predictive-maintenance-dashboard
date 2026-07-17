/**
 * ------------------------------------------------------------------
 * CHART CONFIG — one entry per telemetry signal.
 * Want to add/remove/relabel a chart or status reading? Edit the list
 * that matches your telemetry source below — the Live Telemetry cards,
 * the expanded chart view, and the AI Copilot's "current status" grid
 * are all generated from this single source of truth.
 *
 * Switch which one is active by setting VITE_TELEMETRY_SOURCE=laptop
 * in a frontend .env file (must match TELEMETRY_SOURCE on the backend).
 * ------------------------------------------------------------------
 */

// Config for the simulated industrial machine (default).
const INDUSTRIAL_CHART_CONFIGS = [
  {
    id: "vibration",
    eyebrow: "Rotational & Structural",
    title: "Vibration Signature (X / Y / Z)",
    dataKeys: ["vib_x", "vib_y", "vib_z"],
    labels: ["X", "Y", "Z"],
    colors: ["#B881FF", "#9333EA", "#A78BFA"],
    unit: "",
  },
  {
    id: "temperature",
    eyebrow: "Thermal",
    title: "Core Temperature",
    dataKeys: ["core_temp_c"],
    labels: ["Temp"],
    colors: ["#FFB020"],
    unit: "°C",
  },
  {
    id: "voltage",
    eyebrow: "Electrical Power",
    title: "Voltage Waves (Va / Vb / Vc)",
    dataKeys: ["v_a", "v_b", "v_c"],
    labels: ["Va", "Vb", "Vc"],
    colors: ["#B881FF", "#9333EA", "#B98BFF"],
    unit: "V",
  },
  {
    id: "current",
    eyebrow: "Electrical Power",
    title: "Load Current Draw",
    dataKeys: ["load_current_a"],
    labels: ["Current"],
    colors: ["#FF7A4F"],
    unit: "A",
  },
  {
    id: "acoustic-signal",
    eyebrow: "Signal Telemetry",
    title: "Noise Floor / SNR",
    dataKeys: ["noise_floor_db", "snr_db"],
    labels: ["Noise", "SNR"],
    colors: ["#FF3B5C", "#B881FF"],
    unit: "dB",
  },
];

// Config for real-laptop monitoring mode (see backend/laptop_monitor.py).
const LAPTOP_CHART_CONFIGS = [
  {
    id: "cpu",
    eyebrow: "Processor",
    title: "CPU Usage",
    dataKeys: ["cpu_usage_percent"],
    labels: ["CPU"],
    colors: ["#B881FF"],
    unit: "%",
  },
  {
    id: "cpu-temp",
    eyebrow: "Thermal",
    title: "CPU Temperature",
    dataKeys: ["cpu_temp_c"],
    labels: ["Temp"],
    colors: ["#FFB020"],
    unit: "°C",
  },
  {
    id: "thermal-headroom",
    eyebrow: "Thermal",
    title: "Thermal Headroom (Mac: real, no install needed)",
    dataKeys: ["thermal_pressure_percent"],
    labels: ["Headroom"],
    colors: ["#FF7A4F"],
    unit: "%",
  },
  {
    id: "memory",
    eyebrow: "System",
    title: "Memory Usage",
    dataKeys: ["memory_usage_percent"],
    labels: ["RAM"],
    colors: ["#9333EA"],
    unit: "%",
  },
  {
    id: "disk-io",
    eyebrow: "Storage",
    title: "Disk Read / Write",
    dataKeys: ["disk_read_mb", "disk_write_mb"],
    labels: ["Read", "Write"],
    colors: ["#B881FF", "#FF7A4F"],
    unit: "MB",
  },
  {
    id: "battery",
    eyebrow: "Power",
    title: "Battery Level",
    dataKeys: ["battery_percent"],
    labels: ["Battery"],
    colors: ["#FF3B5C"],
    unit: "%",
  },
];

const TELEMETRY_SOURCE = import.meta.env.VITE_TELEMETRY_SOURCE || "simulated";

export const CHART_CONFIGS =
  TELEMETRY_SOURCE === "laptop" ? LAPTOP_CHART_CONFIGS : INDUSTRIAL_CHART_CONFIGS;

// Used by the live in-dashboard toggle (no restart/env file needed) — pass
// the current source ("simulated" | "laptop") to get the matching configs.
export function getChartConfigs(source) {
  return source === "laptop" ? LAPTOP_CHART_CONFIGS : INDUSTRIAL_CHART_CONFIGS;
}
