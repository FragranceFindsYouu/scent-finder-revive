import { useEffect, useMemo, useState } from "react";
import bottleUrl from "@/assets/ffy-bottle.png";

/**
 * Plays a one-shot perfume spray animation each time the app shell mounts.
 * Renders multiple bottles at varied positions, each emitting mist.
 */
export function SprayIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  const bottles = useMemo(
    () => [
      { top: "30%", left: "20%", size: 260, rotate: -10, delay: 0 },
      { top: "55%", left: "78%", size: 300, rotate: 12, delay: 120 },
      { top: "70%", left: "35%", size: 220, rotate: -6, delay: 240 },
      { top: "25%", left: "65%", size: 240, rotate: 8, delay: 80 },
      { top: "50%", left: "50%", size: 360, rotate: -4, delay: 60 },
    ],
    [],
  );

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden spray-fade"
    >
      <div className="absolute inset-0 spray-wash" />

      {bottles.map((b, idx) => (
        <div
          key={idx}
          className="absolute spray-bottle-wrap"
          style={{
            top: b.top,
            left: b.left,
            transform: `translate(-50%, -50%) rotate(${b.rotate}deg)`,
            animationDelay: `${b.delay}ms`,
          }}
        >
          <div className="relative">
            <img
              src={bottleUrl}
              alt=""
              width={b.size}
              height={b.size}
              className="block select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              style={{ imageRendering: "pixelated" }}
            />
            <div
              className="spray-mist-origin"
              style={{ position: "absolute", top: "18%", left: "62%" }}
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="spray-particle"
                  style={{
                    ["--angle" as never]: `${-70 + i * 9}deg`,
                    ["--delay" as never]: `${b.delay + i * 22}ms`,
                    ["--dist" as never]: `${140 + (i % 4) * 40}px`,
                    ["--size" as never]: `${18 + (i % 5) * 7}px`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
