import { computeSpoonRating } from "../utils/spoonScoring";
import { GRAPH_SPOONS } from "../data/graphSpoons";

const rated = GRAPH_SPOONS.map(computeSpoonRating);

const MATERIAL_COLOR: Record<string, string> = {
  plastic: "#c03030",
  wood:    "#c07a20",
  metal:   "#3a8a3a",
};

const W = 200, H = 110;
const PAD = { l: 28, r: 8, t: 8, b: 22 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

const toX = (v: number) => PAD.l + v * plotW;
const toY = (v: number) => H - PAD.b - v * plotH;

interface Props {
  liveBowlRatio?: number;
  liveOverall?: number;
}

export default function MiniRatingGraph({ liveBowlRatio, liveOverall }: Props) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-warm-black/40 mb-1">Rating Surface</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110, display: "block" }}>
        {/* Ideal-ratio band at 0.2 */}
        <rect x={toX(0.15)} y={PAD.t} width={toX(0.25) - toX(0.15)} height={plotH}
          fill="#3a8a3a" opacity={0.06} />
        <line x1={toX(0.2)} y1={PAD.t} x2={toX(0.2)} y2={H - PAD.b}
          stroke="#3a8a3a" strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />

        {/* Axes */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#bbb" strokeWidth={0.5} />
        <line x1={PAD.l} y1={PAD.t}     x2={PAD.l}     y2={H - PAD.b} stroke="#bbb" strokeWidth={0.5} />

        {/* Tick labels */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(v => (
          <text key={v} x={toX(v)} y={H - PAD.b + 8} textAnchor="middle" fontSize={6} fill="#aaa">{v.toFixed(1)}</text>
        ))}
        {[0, 0.5, 1].map(v => (
          <text key={v} x={PAD.l - 3} y={toY(v) + 2} textAnchor="end" fontSize={6} fill="#aaa">{v.toFixed(1)}</text>
        ))}

        {/* Axis labels */}
        <text x={PAD.l + plotW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill="#999">Bowl Proportion</text>
        <text x={7} y={PAD.t + plotH / 2} textAnchor="middle" fontSize={7} fill="#999"
          transform={`rotate(-90, 7, ${PAD.t + plotH / 2})`}>Rating</text>

        {/* Spoon data points */}
        {rated.map(r => (
          <circle key={r.name}
            cx={toX(r.bowl_to_handle_ratio)} cy={toY(r.overall_rating)}
            r={3.5} fill={MATERIAL_COLOR[r.material] ?? "#888"} opacity={0.75}
          >
            <title>{r.name}: {r.overall_rating.toFixed(2)}</title>
          </circle>
        ))}

        {/* Live spoon */}
        {liveBowlRatio !== undefined && liveOverall !== undefined && (
          <circle cx={toX(liveBowlRatio)} cy={toY(liveOverall)} r={5}
            fill="#1a1a1a" opacity={0.9}>
            <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Legend */}
      <div className="flex gap-3 mt-0.5">
        {(["metal", "wood", "plastic"] as const).map(m => (
          <div key={m} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: MATERIAL_COLOR[m] }} />
            <span className="text-[8px] text-warm-black/40">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
