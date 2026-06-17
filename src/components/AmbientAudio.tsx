import { useEffect, useRef, useState } from "react";

/**
 * Persistent ambient "waterfall" audio synthesized with the Web Audio API.
 * - Starts automatically on first user interaction (browsers block silent autoplay).
 * - Floating button in the bottom-right toggles mute / unmute.
 * - No external assets, loops forever.
 */
export function AmbientAudio() {
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const TARGET_VOLUME = 0.18;

  const ensureStarted = () => {
    if (ctxRef.current) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    ctxRef.current = ctx;

    // Brown noise buffer (≈4s, looped) — softer & deeper than white noise = waterfall.
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Gentle low-pass = water flowing rather than static.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.7;

    // Slow LFO on filter cutoff = subtle "waves" in the cascade.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lp.frequency);

    const master = ctx.createGain();
    master.gain.value = 0;
    gainRef.current = master;

    noise.connect(lp).connect(master).connect(ctx.destination);
    noise.start();
    lfo.start();

    nodesRef.current = [noise, lfo, lfoGain, lp, master];

    // Fade in
    const now = ctx.currentTime;
    master.gain.linearRampToValueAtTime(TARGET_VOLUME, now + 1.5);
    setStarted(true);
  };

  // Start on first user gesture.
  useEffect(() => {
    const handler = () => {
      ensureStarted();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        nodesRef.current.forEach((n) => {
          if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
            try { (n as OscillatorNode).stop(); } catch { /* noop */ }
          }
          n.disconnect();
        });
        ctxRef.current?.close();
      } catch { /* noop */ }
    };
  }, []);

  const toggle = () => {
    if (!ctxRef.current) {
      ensureStarted();
      return;
    }
    const ctx = ctxRef.current;
    const g = gainRef.current;
    if (!g) return;
    if (ctx.state === "suspended") void ctx.resume();
    const next = !muted;
    setMuted(next);
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.linearRampToValueAtTime(next ? 0 : TARGET_VOLUME, now + 0.4);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute ambient waterfall sound" : "Mute ambient waterfall sound"}
      title={muted ? "Unmute waterfall" : "Mute waterfall"}
      className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary/90 text-primary-foreground shadow-soft backdrop-blur hover:bg-rose transition-colors flex items-center justify-center"
    >
      {muted || !started ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
