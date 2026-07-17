import { useEffect, useRef, useState } from "react";
import { playFaultBeep } from "../utils/sounds.js";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const HISTORY_LENGTH = 60;

export function useTelemetryStream(assetId, session, source = "simulated") {
  const [history, setHistory] = useState([]);
  const [anomalies, setAnomalies] = useState([]); // recent anomaly.detected events (with briefings)
  const [emergencyCase, setEmergencyCase] = useState(null); // { case_id, fault_code, countdown_seconds }
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    setHistory([]); // clear stale readings from the previous source when switching
    const url = `${WS_URL}/ws/telemetry/${assetId}?session_id=${session.sessionId}&operator=${session.username}&source=${source}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "telemetry.tick") {
        setHistory((prev) => {
          const next = [...prev, { ...msg.data.features, timestamp: msg.data.timestamp }];
          return next.slice(-HISTORY_LENGTH);
        });
      } else if (msg.type === "anomaly.detected") {
        setAnomalies((prev) => [msg.data, ...prev].slice(0, 20));
        playFaultBeep(); // slow beep whenever a fault is detected
      } else if (msg.type === "emergency.trigger") {
        setEmergencyCase(msg.data);
        playFaultBeep(); // slow beep for critical emergencies too
      } else if (msg.type === "emergency.resolved") {
        setEmergencyCase(null);
      }
    };

    return () => ws.close();
  }, [assetId, session, source]);

  return { history, anomalies, emergencyCase, setEmergencyCase, connected };
}
