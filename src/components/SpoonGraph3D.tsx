import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import _Plot from "react-plotly.js";
import { ratioScore, materialScore, overallScore } from "../utils/spoonScoring";
import { spoons } from "../data/spoons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot: typeof _Plot = (_Plot as any).default ?? _Plot;

const CREAM = "#f5ede0";
const FONT  = "Helvetica Neue, Helvetica, Arial, sans-serif";

const MATERIAL_COLOR: Record<string, string> = {
  plastic: "#c03030",
  wood:    "#c07a20",
  metal:   "#3a8a3a",
};

const rated = spoons.map(s => ({
  name:                   s.name,
  bowl_to_handle_ratio:   s.ratio,
  ratio_preference_score: ratioScore(s.ratio),
  enjoyment:              s.enjoyment,
  material:               s.material,
  material_rating:        materialScore(s.material),
  overall_rating:         overallScore(s),
  location:               s.location,
}));

function fitPlane(pts: { x: number; y: number; z: number }[]) {
  let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, sxz = 0, syy = 0, syz = 0;
  for (const p of pts) {
    sx += p.x; sy += p.y; sz += p.z;
    sxx += p.x * p.x; sxy += p.x * p.y; sxz += p.x * p.z;
    syy += p.y * p.y; syz += p.y * p.z;
  }
  const n = pts.length;
  const det3 = (m: number[][]) =>
    m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) -
    m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) +
    m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const A = [[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]];
  const b = [sxz, syz, sz];
  const D  = det3(A);
  const a  = det3([[b[0],A[0][1],A[0][2]],[b[1],A[1][1],A[1][2]],[b[2],A[2][1],A[2][2]]]) / D;
  const bC = det3([[A[0][0],b[0],A[0][2]],[A[1][0],b[1],A[1][2]],[A[2][0],b[2],A[2][2]]]) / D;
  const c  = det3([[A[0][0],A[0][1],b[0]],[A[1][0],A[1][1],b[1]],[A[2][0],A[2][1],b[2]]]) / D;
  return { a, b: bC, c };
}

const planeCoefs = fitPlane(rated.map(r => ({ x: r.bowl_to_handle_ratio, y: r.enjoyment, z: r.overall_rating })));

const planeZ = (x: number, y: number) =>
  Math.max(0, Math.min(1, planeCoefs.a*x + planeCoefs.b*y + planeCoefs.c));

const PG = 6;
const pgX = Array.from({ length: PG }, (_, i) => i / (PG - 1));
const pgY = Array.from({ length: PG }, (_, i) => i / (PG - 1));
const pgZ = pgY.map(y => pgX.map(x => planeZ(x, y)));

const GN = 10;
const gVals = Array.from({ length: GN }, (_, i) => i / (GN - 1));
const wx: number[] = [], wy: number[] = [], wz: number[] = [];
for (const y of gVals) {
  for (const x of gVals) { wx.push(x); wy.push(y); wz.push(planeZ(x, y)); }
  wx.push(NaN); wy.push(NaN); wz.push(NaN);
}
for (const x of gVals) {
  for (const y of gVals) { wx.push(x); wy.push(y); wz.push(planeZ(x, y)); }
  wx.push(NaN); wy.push(NaN); wz.push(NaN);
}

class PlotBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null };
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  render() {
    if (this.state.err) {
      return <div className="flex items-center justify-center h-full text-xs text-warm-black/50 p-6">{this.state.err}</div>;
    }
    return this.props.children;
  }
}

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
  const outerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const chartH = Math.floor(size.h * 2 / 3);
  const tableH = size.h - chartH;

  const markerColors = rated.map((_, i) => i === hoveredIdx ? "#e53935" : "#1a1a1a");

  const planeTrace = {
    type:       "surface" as const,
    x:          pgX,
    y:          pgY,
    z:          pgZ,
    colorscale: [[0, "rgba(210,210,210,0.25)"], [1, "rgba(210,210,210,0.25)"]],
    showscale:  false,
    opacity:    0.4,
    hoverinfo:  "skip" as const,
  };

  const wireframeTrace = {
    type:       "scatter3d" as const,
    mode:       "lines" as const,
    x:          wx,
    y:          wy,
    z:          wz,
    line:       { color: "rgba(60,60,60,0.45)", width: 1 },
    hoverinfo:  "skip" as const,
    showlegend: false,
  };

  const scatterTrace = {
    type:     "scatter3d" as const,
    mode:     "markers" as const,
    x:        rated.map(r => r.bowl_to_handle_ratio),
    y:        rated.map(r => r.enjoyment),
    z:        rated.map(r => r.overall_rating),
    marker:   {
      size:    4,
      color:   markerColors,
      opacity: 1,
      line:    { color: "white", width: 0.5 },
    },
    hovertemplate: rated.map(r =>
      `${r.name}<br>ratio: ${r.bowl_to_handle_ratio.toFixed(2)}<br>enjoy: ${r.enjoyment.toFixed(2)}<br>overall: ${r.overall_rating.toFixed(2)}<extra></extra>`
    ),
  };

  const layout = {
    width:         size.w,
    height:        chartH,
    autosize:      false,
    datarevision:  hoveredIdx,
    paper_bgcolor: CREAM,
    plot_bgcolor:  CREAM,
    font:          { family: FONT, size: 10, color: "#1a1a1a" },
    margin:        { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      xaxis: { title: "Bowl-Handle Ratio", range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      yaxis: { title: "Enjoyment",         range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      zaxis: { title: "Overall Rating",    range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      bgcolor:    CREAM,
      aspectmode: "cube" as const,
      camera:     { eye: { x: 1.6, y: -1.6, z: 0.9 } },
    },
  };

  return (
    <div ref={outerRef} className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CREAM }}>

      {/* Info box */}
      <div className="absolute top-3 right-3 z-10 bg-white/90 border border-warm-black/10 rounded p-3 text-[9px] leading-relaxed text-warm-black/70 max-w-[200px]">
        <p className="font-semibold text-warm-black/80 mb-1 tracking-wide uppercase text-[8px]">How scores are calculated</p>
        <p><span className="font-medium text-warm-black">Overall</span> — average of ratio, enjoyment, and material (each 0–1).</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Bowl-Handle Ratio</span> — peaks at 1.0 when ratio = 0.20 (20% bowl). Falls linearly to 0 as it deviates.</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Enjoyment</span> — direct input, 0–1.</p>
        <p className="mt-1"><span className="font-medium text-warm-black">Material</span> — plastic = 0, wood = 0.5, metal = 1.0.</p>
      </div>

      {/* Top 2/3 — 3D plot, pixel height so Plotly cursor math is exact */}
      <div style={{ height: chartH, flexShrink: 0, overflow: "hidden" }}>
        <PlotBoundary>
          <Plot
            data={[planeTrace, wireframeTrace, scatterTrace] as Plotly.Data[]}
            layout={layout as Partial<Plotly.Layout>}
            style={{ width: size.w, height: chartH }}
            config={{ displayModeBar: false, responsive: false }}
          />
        </PlotBoundary>
      </div>

      {/* Bottom 1/3 — table with independent scroll */}
      <div className="border-t border-warm-black/15 overflow-y-auto" style={{ height: tableH }}>
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
