import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import _Plot from "react-plotly.js";
import { ratioScore, materialScore, overallScore } from "../utils/spoonScoring";
import { spoons } from "../data/spoons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot: typeof _Plot = (_Plot as any).default ?? _Plot;

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

export interface RatedSpoon {
  name: string;
  bowl_to_handle_ratio: number;
  ratio_preference_score: number;
  enjoyment: number;
  material: string;
  material_rating: number;
  overall_rating: number;
  location: string;
}

// Derived once from the single source of truth. Shared with the data table.
export const rated: RatedSpoon[] = spoons.map(s => ({
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

interface Props {
  /** Index whose scatter point is highlighted red (driven by the data-table hover). */
  hoveredIdx?: number | null;
  /** Plotly background. Defaults to transparent so the graph sits on whatever is behind it. */
  background?: string;
}

export default function RatingGraph3D({ hoveredIdx = null, background = "rgba(0,0,0,0)" }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });

  // Measure our own container so Plotly's pixel-exact cursor math stays correct.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

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
    type:       "scatter3d" as const,
    mode:       "markers" as const,
    showlegend: false,
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
    height:        size.h,
    autosize:      false,
    datarevision:  hoveredIdx,
    paper_bgcolor: background,
    plot_bgcolor:  background,
    font:          { family: FONT, size: 10, color: "#1a1a1a" },
    margin:        { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      xaxis: { title: "Bowl-Handle Ratio", range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      yaxis: { title: "Enjoyment",         range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      zaxis: { title: "Overall Rating",    range: [0, 1] as [number, number], gridcolor: "#bbb", gridwidth: 1 },
      bgcolor:    background,
      aspectmode: "cube" as const,
      camera:     { eye: { x: 1.6, y: -1.6, z: 0.9 } },
    },
  };

  return (
    <div ref={outerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <PlotBoundary>
        <Plot
          data={[planeTrace, wireframeTrace, scatterTrace] as Plotly.Data[]}
          layout={layout as Partial<Plotly.Layout>}
          style={{ width: size.w, height: size.h }}
          config={{ displayModeBar: false, responsive: false }}
        />
      </PlotBoundary>
    </div>
  );
}
