import { useEffect, useState } from "react";

/**
 * Plays a one-shot perfume spray animation each time the app shell mounts
 * (i.e. on page refresh / first load). Pure CSS — no deps.
 */
export function SprayIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden spray-fade"
    >
      {/* soft tint wash */}
      <div className="absolute inset-0 spray-wash" />

      {/* bottle + nozzle, centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 spray-bottle-wrap">
        <svg
          width="120"
          height="170"
          viewBox="0 0 120 170"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
        >
          {/* cap */}
          <rect x="46" y="6" width="28" height="22" rx="3" fill="#1a1a1a" />
          {/* neck */}
          <rect x="52" y="28" width="16" height="10" fill="#2a2a2a" />
          {/* shoulders + body */}
          <path
            d="M30 50 Q30 38 50 38 H70 Q90 38 90 50 V150 Q90 162 78 162 H42 Q30 162 30 150 Z"
            fill="url(#liquid)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1"
          />
          {/* highlight */}
          <path
            d="M40 55 Q38 90 44 140"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* label */}
          <rect x="42" y="92" width="36" height="36" fill="rgba(255,255,255,0.85)" rx="2" />
          <text
            x="60"
            y="115"
            textAnchor="middle"
            fontFamily="Cormorant Garamond, serif"
            fontSize="11"
            fill="#1a1a1a"
            fontStyle="italic"
          >
            FFY
          </text>
          <defs>
            <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7d27a" />
              <stop offset="100%" stopColor="#c89a3a" />
            </linearGradient>
          </defs>
        </svg>

        {/* mist particles emerging from the nozzle */}
        <div className="spray-mist-origin">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="spray-particle"
              style={{
                ["--angle" as never]: `${-60 + i * 9}deg`,
                ["--delay" as never]: `${i * 22}ms`,
                ["--dist" as never]: `${140 + (i % 4) * 35}px`,
                ["--size" as never]: `${18 + (i % 5) * 6}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
