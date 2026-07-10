import { useState } from "react";
import RatingGraph3D, { rated } from "./RatingGraph3D";

const CREAM = "#f5ede0";

const MATERIAL_COLOR: Record<string, string> = {
  plastic: "#c03030",
  wood:    "#c07a20",
  metal:   "#3a8a3a",
};

function RatioBar({ ratio }: { ratio: number }) {
  const W = 88, H = 18, PAD = 6;
  const plotW  = W - PAD * 2;
  const dotX   = PAD + ratio * plotW;
  const idealX = PAD + 0.2 * plotW;
  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke="#ccc" strokeWidth={1} />
      <text x={PAD-2}     y={H/2+3} textAnchor="end"   fontSize={6} fill="#bbb">H</text>
      <text x={W-PAD+2}   y={H/2+3} textAnchor="start" fontSize={6} fill="#bbb">B</text>
      <line x1={idealX} y1={H/2-4} x2={idealX} y2={H/2+4} stroke="#3a8a3a" strokeWidth={1} opacity={0.5} />
      <circle cx={dotX} cy={H/2} r={2} fill="#999" />
    </svg>
  );
}

export default function SpoonGraph3D() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CREAM }}>

      {/* Info box */}
      <div className="absolute top-3 right-3 z-10 bg-white/90 border border-warm-black/10 rounded p-3 text-[9px] leading-relaxed text-warm-black/70 max-w-[200px]">
        <p className="font-semibold text-warm-black/80 mb-1 tracking-wide uppercase text-[8px]">How scores are calculated</p>
        <p><span className="font-medium text-warm-black">Overall</span> — average of ratio, enjoyment, and material (each 0–1).</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Bowl-Handle Ratio</span> — peaks at 1.0 when ratio = 0.20 (20% bowl). Falls linearly to 0 as it deviates.</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Enjoyment</span> — direct input, 0–1.</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Material</span> — plastic = 0, wood = 0.5, metal = 1.0.</p>
      </div>

      {/* Top 2/3 — the 3D graph */}
      <div style={{ flex: 2, minHeight: 0 }}>
        <RatingGraph3D hoveredIdx={hoveredIdx} background={CREAM} />
      </div>

      {/* Bottom 1/3 — table with independent scroll */}
      <div className="border-t border-warm-black/15 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr style={{ background: "#f0e8d8" }}>
              {["Name", "Ratio", "Enjoyment", "Material", "Overall", "Used At"].map(h => (
                <th key={h}
                  className="px-3 py-2 text-left tracking-wide uppercase text-[9px] font-medium text-warm-black/50"
                  style={{ borderBottom: "1px solid rgba(26,26,26,0.12)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rated.map((r, i) => (
              <tr
                key={r.name}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  background:   hoveredIdx === i ? "rgba(229,57,53,0.07)" : i % 2 === 0 ? "transparent" : "rgba(26,26,26,0.025)",
                  borderBottom: "1px solid rgba(26,26,26,0.06)",
                  cursor:       "default",
                }}>
                <td className="px-3 py-1.5 font-sans">{r.name}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <RatioBar ratio={r.bowl_to_handle_ratio} />
                    <span className="tabular-nums font-mono">{r.bowl_to_handle_ratio.toFixed(2)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.enjoyment.toFixed(2)}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wide text-white"
                    style={{ background: MATERIAL_COLOR[r.material] ?? "#888" }}>
                    {r.material}
                  </span>
                </td>
                <td className="px-3 py-1.5 tabular-nums font-mono font-medium">{r.overall_rating.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-warm-black/70">{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
