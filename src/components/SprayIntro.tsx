import { useEffect, useState } from "react";
import bottleUrl from "@/assets/ffy-bottle.png";

/**
 * Plays a one-shot perfume spray animation each time the app shell mounts
 * (i.e. on page refresh / first load).
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
      <div className="absolute inset-0 spray-wash" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 spray-bottle-wrap">
        <img
          src={bottleUrl}
          alt=""
          width={200}
          height={200}
          className="block select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
          style={{ imageRendering: "pixelated" }}
        />

        {/* mist particles emerging from the nozzle (top-right of bottle) */}
        <div
          className="spray-mist-origin"
          style={{ position: "absolute", top: "18%", left: "62%" }}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="spray-particle"
              style={{
                ["--angle" as never]: `${-70 + i * 7}deg`,
                ["--delay" as never]: `${i * 18}ms`,
                ["--dist" as never]: `${160 + (i % 4) * 40}px`,
                ["--size" as never]: `${20 + (i % 5) * 7}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
