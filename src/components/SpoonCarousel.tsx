import { useEffect, useRef, useState } from "react";
import type { Spoon } from "../data/spoons";
import { computeScore, getBadgeColor, BADGE_CLASSES } from "../utils/scoring";

interface Props {
  spoons: Spoon[];
  onRateClick: () => void;
}

// Slot offset → visual properties
function slotScale(offset: number): number {
  return offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.72 : 0.5;
}
function slotOpacity(offset: number): number {
  return offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.6 : 0.32;
}
// x position as % of carousel width (center of spoon)
function slotX(offset: number): number {
  return 50 + offset * 20;
}

// Wrapping offset: maps each spoon index to -2..+2 around activeIndex
function wrappedOffset(i: number, activeIndex: number, total: number): number {
  const half = Math.floor(total / 2);
  return ((i - activeIndex + half) % total + total) % total - half;
}

// Badge definitions: positions as fraction of carousel area (0–1)
const BADGE_DEFS = [
  { key: "bowl"      as const, labelSide: "right" as const, bx: 0.67, by: 0.20, ax: 0.565, ay: 0.20 },
  { key: "enjoyment" as const, labelSide: "left"  as const, bx: 0.33, by: 0.40, ax: 0.435, ay: 0.40 },
  { key: "length"    as const, labelSide: "right" as const, bx: 0.67, by: 0.58, ax: 0.575, ay: 0.58 },
  { key: "material"  as const, labelSide: "left"  as const, bx: 0.31, by: 0.75, ax: 0.425, ay: 0.75 },
];

export default function SpoonCarousel({ spoons, onRateClick }: Props) {
  const [activeIndex, setActiveIndex] = useState(2); // plastic offender centered by default
  const [size, setSize] = useState({ w: 1280, h: 560 });
  const areaRef = useRef<HTMLDivElement>(null);

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

  const total = spoons.length;
  const active = spoons[activeIndex]!;
  const score = computeScore(active.scores);
  const { w, h } = size;

  function prev() { setActiveIndex(i => (i - 1 + total) % total); }
  function next() { setActiveIndex(i => (i + 1) % total); }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* Carousel stage */}
      <div ref={areaRef} className="relative flex-1 overflow-hidden">

        {/* Rate Your Spoon button */}
        <button
          onClick={onRateClick}
          className="absolute top-4 right-4 z-30 border border-warm-black/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-warm-black hover:text-cream transition-colors"
        >
          Rate Your Spoon
        </button>

        {/* Left nav */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-2xl font-light text-warm-black/70 hover:text-warm-black transition-colors select-none"
          aria-label="Previous spoon"
        >
          &lt;
        </button>

        {/* Right nav */}
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-2xl font-light text-warm-black/70 hover:text-warm-black transition-colors select-none"
          aria-label="Next spoon"
        >
          &gt;
        </button>

        {/* Spoon images */}
        {spoons.map((spoon, i) => {
          const offset = wrappedOffset(i, activeIndex, total);
          if (Math.abs(offset) > 2) return null;
          const scale = slotScale(offset);
          const opacity = slotOpacity(offset);
          const xPct = slotX(offset);
          const zIndex = offset === 0 ? 10 : Math.abs(offset) === 1 ? 5 : 1;

          return (
            <div
              key={spoon.id}
              onClick={() => setActiveIndex(i)}
              style={{
                position: "absolute",
                left: `${xPct}%`,
                top: "50%",
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                zIndex,
                height: "82%",
                transition: "left 0.35s ease, transform 0.35s ease, opacity 0.35s ease",
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
          );
        })}

        {/* SVG annotation lines (only shown for active/center spoon) */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 15, overflow: "visible" }}
          viewBox={`0 0 ${w} ${h}`}
        >
          {BADGE_DEFS.map(({ key, bx, by, ax, ay, labelSide }) => {
            const score = active.scores[key];
            const color = getBadgeColor(score);
            // Connect badge edge to anchor — badge half-width ≈ 5.5% of w
            const halfW = w * 0.055;
            const lineX1 = labelSide === "right" ? bx * w - halfW : bx * w + halfW;
            const lineY1 = by * h;
            const lineX2 = ax * w;
            const lineY2 = ay * h;
            const strokeColor = color === "green" ? "#3a8a3a" : color === "amber" ? "#9a6020" : "#8a2020";
            return (
              <line
                key={key}
                x1={lineX1} y1={lineY1}
                x2={lineX2} y2={lineY2}
                stroke={strokeColor}
                strokeWidth="1"
                strokeDasharray="5 4"
                opacity="0.7"
              />
            );
          })}
        </svg>

        {/* Score badge pills */}
        {BADGE_DEFS.map(({ key, bx, by }) => {
          const scoreVal = active.scores[key];
          const color = getBadgeColor(scoreVal);
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left: `${bx * 100}%`,
                top: `${by * 100}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
                transition: "opacity 0.35s ease",
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${BADGE_CLASSES[color]}`}
            >
              {key}: {scoreVal}/25
            </div>
          );
        })}
      </div>

      {/* Score + review footer */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-1 py-5">
        <span className="text-lg tracking-wide text-warm-black">{score}/100</span>
        <p className="text-xs text-warm-black/70 text-center max-w-xs leading-relaxed">{active.review}</p>
      </div>
    </div>
  );
}
