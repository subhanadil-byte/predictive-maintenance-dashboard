/**
 * Small sound-effect helpers. These generate tones directly in the browser
 * using the Web Audio API — no .mp3/.wav files to manage or download.
 *
 * Want to tweak how a sound feels? Change the numbers below:
 *   - frequency: pitch (higher number = higher pitch)
 *   - duration: how long the tone plays, in seconds
 *   - type: waveform shape ("sine" = smooth, "square"/"sawtooth" = buzzy)
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  // Browsers suspend audio until a user gesture — resume defensively.
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone({ frequency, duration, type = "sine", volume = 0.15, delay = 0 }) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  } catch {
    // Audio isn't available (e.g. blocked by browser) — fail silently.
  }
}

/** Short "buzz" — played when switching dashboard tabs. */
export function playTabBuzz() {
  playTone({ frequency: 180, duration: 0.06, type: "square", volume: 0.08 });
  // Real vibration on phones/tablets that support it (no effect on desktop).
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(40);
  }
}

/** Slow, deliberate beep — played when a fault/anomaly is detected. */
export function playFaultBeep() {
  playTone({ frequency: 520, duration: 0.35, type: "sine", volume: 0.18, delay: 0 });
  playTone({ frequency: 520, duration: 0.35, type: "sine", volume: 0.18, delay: 0.55 });
}
