import { useState } from "react";
import { LOGIN_TEXT } from "../constants/labels.js";

/**
 * Neumorphic (soft-UI) login screen — light gray background, "pressed in"
 * inputs, and a "raised" button, matching the reference design exactly.
 * This screen intentionally does NOT use the app's dark violet theme —
 * it's a deliberately different, standalone look per the design brief.
 */
export default function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  // Neumorphic shadow recipes (edit these two lines to retune the 3D effect).
  const raisedShadow = "shadow-[9px_9px_16px_#c5c5c8,-9px_-9px_16px_#ffffff]";
  const pressedShadow = "shadow-[inset_6px_6px_12px_#c5c5c8,inset_-6px_-6px_12px_#ffffff]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6e6e9]">
      <form
        onSubmit={handleSubmit}
        className={`bg-[#e6e6e9] rounded-[2rem] p-10 w-full max-w-sm ${raisedShadow}`}
      >
        <h1 className="text-center text-3xl font-bold text-[#4b4b4f] mb-8">
          {LOGIN_TEXT.title}
        </h1>

        <label className="block text-[#4b4b4f] font-medium mb-2">
          {LOGIN_TEXT.usernameLabel}
        </label>
        <div className={`bg-[#e6e6e9] rounded-full mb-6 ${pressedShadow}`}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={LOGIN_TEXT.usernamePlaceholder}
            className="w-full bg-transparent outline-none px-5 py-3 text-[#4b4b4f] placeholder-[#9a9a9e]"
            autoComplete="username"
          />
        </div>

        <label className="block text-[#4b4b4f] font-medium mb-2">
          {LOGIN_TEXT.passwordLabel}
        </label>
        <div className={`bg-[#e6e6e9] rounded-full mb-8 ${pressedShadow}`}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={LOGIN_TEXT.passwordPlaceholder}
            className="w-full bg-transparent outline-none px-5 py-3 text-[#4b4b4f] placeholder-[#9a9a9e]"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="text-red-500 text-xs text-center mb-4">
            {LOGIN_TEXT.accessDeniedPrefix} {error}
          </div>
        )}

        <div className="flex justify-center mb-4">
          <button
            type="submit"
            disabled={loading}
            className={`bg-[#e6e6e9] text-[#4b4b4f] font-semibold px-10 py-3 rounded-full ${raisedShadow} active:${pressedShadow} disabled:opacity-60 transition-shadow`}
          >
            {loading ? LOGIN_TEXT.authenticating : LOGIN_TEXT.loginButton}
          </button>
        </div>

        <div className="text-right">
          <button type="button" className="text-sm text-[#9a9a9e] hover:text-[#4b4b4f]">
            {LOGIN_TEXT.forgotPassword}
          </button>
        </div>
      </form>
    </div>
  );
}
