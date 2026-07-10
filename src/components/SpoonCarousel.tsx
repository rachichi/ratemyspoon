import { useEffect, useRef, useState } from "react";
import type { Spoon } from "../data/spoons";
import { computeScore, getBadgeColor, BADGE_CLASSES } from "../utils/scoring";

interface Props {
  spoons: Spoon[];
  onRateClick: () => void;
}

function slotScale(offset: number): number {
  const abs = Math.min(Math.abs(offset), 2);
  return abs === 0 ? 1 : abs === 1 ? 0.72 : 0.5;
}
function slotOpacity(offset: number): number {
  const abs = Math.abs(offset);
  if (abs === 0) return 1;
  if (abs === 1) return 0.6;
  if (abs === 2) return 0.32;
  return 0; // ±3 buffer slots are invisible
}
// x position as % of carousel width; ±3 land ~16% off each edge (off-screen)
function slotX(offset: number): number {
  return 50 + offset * 22;
}

// Badge base positions and spoon anchor positions as fractions (0–1) of carousel dims.
// Lines are diagonal: badge by ≠ anchor ay.
const BADGE_DEFS = [
  { key: "bowl"      as const, bx: 0.665, by: 0.17, ax: 0.515, ay: 0.23 },
  { key: "enjoyment" as const, bx: 0.315, by: 0.43, ax: 0.484, ay: 0.37 },
  { key: "length"    as const, bx: 0.670, by: 0.56, ax: 0.518, ay: 0.61 },
  { key: "material"  as const, bx: 0.305, by: 0.77, ax: 0.482, ay: 0.73 },
];

// Per-badge parallax strengths [px-x, px-y]
const PARALLAX: [number, number][] = [
  [ 8,  6],
  [10,  8],
  [ 7, 10],
  [11,  6],
];

export default function SpoonCarousel({ spoons, onRateClick }: Props) {
  // Unbounded position counter — no modulo wrapping, so spoons never teleport
  const [pos, setPos] = useState(2);
  const [size, setSize] = useState({ w: 1280, h: 560 });
  const [smoothMouse, setSmoothMouse] = useState({ x: 0, y: 0 });

  const areaRef = useRef<HTMLDivElement>(null);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseSmooth = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", handleMove);

    function tick() {
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * 0.07;
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * 0.07;
      setSmoothMouse({ x: mouseSmooth.current.x, y: mouseSmooth.current.y });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const n = spoons.length;
  const activeSpoon = spoons[((pos % n) + n) % n]!;
  const score = computeScore(activeSpoon.scores);
  const { w, h } = size;

  // Render a buffer of ±3 virtual slots. Slots at |offset|===3 are off-screen (opacity 0)
  // but are already in position so they smoothly slide into view — no teleport.
  const virtualSlots: { v: number; spoon: Spoon; offset: number }[] = [];
  for (let v = pos - 3; v <= pos + 3; v++) {
    const spoonIdx = ((v % n) + n) % n;
    virtualSlots.push({ v, spoon: spoons[spoonIdx]!, offset: v - pos });
  }

  const badgeOffsets = BADGE_DEFS.map((_, i) => ({
    px: smoothMouse.x * (PARALLAX[i]?.[0] ?? 8),
    py: smoothMouse.y * (PARALLAX[i]?.[1] ?? 6),
  }));

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div ref={areaRef} className="relative flex-1 overflow-hidden">

        <button
          onClick={onRateClick}
          className="absolute top-4 right-4 z-30 border border-warm-black/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-warm-black hover:text-cream transition-colors"
        >
          Rate Your Spoon
        </button>

        <button
          onClick={() => setPos(p => p - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-2xl font-light text-warm-black/70 hover:text-warm-black transition-colors select-none"
          aria-label="Previous spoon"
        >
          &lt;
        </button>

        <button
          onClick={() => setPos(p => p + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-2xl font-light text-warm-black/70 hover:text-warm-black transition-colors select-none"
          aria-label="Next spoon"
        >
          &gt;
        </button>

        {/* Spoon images — keyed by virtual position v so CSS transition tracks each slot */}
        {virtualSlots.map(({ v, spoon, offset }) => (
          <div
            key={v}
            onClick={() => { if (offset !== 0) setPos(pos + offset); }}
            style={{
              position: "absolute",
              left: `${slotX(offset)}%`,
              top: "50%",
              transform: `translate(-50%, -50%) scale(${slotScale(offset)})`,
              opacity: slotOpacity(offset),
              zIndex: offset === 0 ? 10 : Math.abs(offset) === 1 ? 5 : 1,
              height: "82%",
              transition: "left 0.38s ease, transform 0.38s ease, opacity 0.38s ease",
              cursor: offset !== 0 ? "pointer" : "default",
            }}
          >
            <img
              src={spoon.image}
              alt={spoon.name}
              style={{ height: "100%", width: "auto", objectFit: "contain", display: "block" }}
              draggable={false}
            />
          </div>
        ))}

        {/* SVG annotation lines + anchor dot */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 15, overflow: "visible" }}
          viewBox={`0 0 ${w} ${h}`}
        >
          {BADGE_DEFS.map(({ key, bx, by, ax, ay }, i) => {
            const scoreVal = activeSpoon.scores[key];
            const color = getBadgeColor(scoreVal);
            const { px, py } = badgeOffsets[i]!;
            const badgeCx = bx * w + px;
            const badgeCy = by * h + py;
            const anchorX = ax * w;
            const anchorY = ay * h;
            const dx = anchorX - badgeCx;
            const dy = anchorY - badgeCy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const edgeOffset = Math.min(55, dist * 0.4);
            const lineX1 = badgeCx + (dx / dist) * edgeOffset;
            const lineY1 = badgeCy + (dy / dist) * edgeOffset;
            const strokeColor = color === "green" ? "#3a8a3a" : color === "amber" ? "#9a6020" : "#8a2020";
            return (
              <g key={key}>
                <line
                  x1={lineX1} y1={lineY1}
                  x2={anchorX} y2={anchorY}
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeDasharray="5 4"
                  opacity="0.65"
                />
                {/* Dot at anchor point on the spoon */}
                <circle
                  cx={anchorX} cy={anchorY} r={3}
                  fill={strokeColor}
                  opacity="0.85"
                />
              </g>
            );
          })}
        </svg>

        {/* Score badge pills */}
        {BADGE_DEFS.map(({ key, bx, by }, i) => {
          const scoreVal = activeSpoon.scores[key];
          const color = getBadgeColor(scoreVal);
          const { px, py } = badgeOffsets[i]!;
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left: `${bx * 100}%`,
                top: `${by * 100}%`,
                transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
                zIndex: 20,
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${BADGE_CLASSES[color]}`}
            >
              {key}: {scoreVal}/25
            </div>
          );
        })}
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center gap-1 py-5">
        <span className="text-lg tracking-wide text-warm-black">{score}/100</span>
        <p className="text-xs text-warm-black/70 text-center max-w-xs leading-relaxed">{activeSpoon.review}</p>
      </div>
    </div>
  );
}
