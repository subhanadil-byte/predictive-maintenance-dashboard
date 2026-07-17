import { useCallback, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useAuth() {
  const [session, setSession] = useState(null); // { token, operatorName, role, sessionId, username }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Invalid credentials");
      }
      const data = await res.json();
      setSession({
        token: data.access_token,
        operatorName: data.operator_name,
        role: data.role,
        sessionId: data.session_id,
        username,
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!session) return;
    try {
      await fetch(`${API_URL}/auth/logout?session_id=${session.sessionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } finally {
      setSession(null);
    }
  }, [session]);

  return { session, login, logout, error, loading, API_URL };
}
