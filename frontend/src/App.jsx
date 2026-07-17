import LoginScreen from "./components/LoginScreen.jsx";
import DashboardShell from "./components/DashboardShell.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useTheme } from "./hooks/useTheme.js";

export default function App() {
  const { session, login, logout, error, loading, API_URL } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!session) {
    return <LoginScreen onLogin={login} error={error} loading={loading} />;
  }

  return <DashboardShell session={session} apiUrl={API_URL} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />;
}
