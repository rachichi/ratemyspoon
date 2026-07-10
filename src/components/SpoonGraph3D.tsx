import Plot from "react-plotly.js";
import { computeSpoonRating, ratingFromParams } from "../utils/spoonScoring";
import { GRAPH_SPOONS } from "../data/graphSpoons";

const CREAM = "#f5ede0";
const FONT  = "Helvetica Neue, Helvetica, Arial, sans-serif";

const MATERIAL_COLOR: Record<string, string> = {
  plastic: "#c03030",
  wood:    "#c07a20",
  metal:   "#3a8a3a",
};

// Scoring surface: vary bowl_ratio (X) and enjoyment (Y), fix material at 0.5 (wood midpoint)
const N = 28;
const xVals: number[] = Array.from({ length: N }, (_, i) => i / (N - 1));
const yVals: number[] = Array.from({ length: N }, (_, i) => i / (N - 1));
const zGrid: number[][] = yVals.map(y => xVals.map(x => ratingFromParams(x, y, 0.5)));

const rated = GRAPH_SPOONS.map(computeSpoonRating);

export default function SpoonGraph3D() {
  const surfaceTrace = {
    type:           "surface" as const,
    x:              xVals,
    y:              yVals,
    z:              zGrid,
    colorscale:     "RdYlGn",
    cmin:           0,
    cmax:           1,
    opacity:        0.65,
    showscale:      false,
    hovertemplate:  "ratio: %{x:.2f}<br>enjoy: %{y:.2f}<br>rating: %{z:.2f}<extra></extra>",
  };

  const scatterTrace = {
    type:         "scatter3d" as const,
    mode:         "markers+text" as const,
    x:            rated.map(r => r.bowl_to_handle_ratio),
    y:            rated.map(r => r.enjoyment),
    z:            rated.map(r => r.overall_rating),
    text:         rated.map(r => r.name),
    textposition: "top center" as const,
    textfont:     { size: 9, color: "#1a1a1a" },
    marker: {
      size:       7,
      color:      rated.map(r => r.overall_rating),
      colorscale: "RdYlGn",
      cmin:       0,
      cmax:       1,
      opacity:    1,
      line:       { color: "#1a1a1a", width: 0.5 },
    },
    hovertemplate: "%{text}<br>ratio: %{x:.2f}<br>enjoy: %{y:.2f}<br>overall: %{z:.2f}<extra></extra>",
  };

  const layout = {
    paper_bgcolor: CREAM,
    plot_bgcolor:  CREAM,
    font:          { family: FONT, size: 10, color: "#1a1a1a" },
    margin:        { l: 0, r: 0, t: 40, b: 0 },
    scene: {
      xaxis: { title: "Bowl Proportion", range: [0, 1] as [number, number], gridcolor: "#ccc" },
      yaxis: { title: "Enjoyment",       range: [0, 1] as [number, number], gridcolor: "#ccc" },
      zaxis: { title: "Overall Rating",  range: [0, 1] as [number, number], gridcolor: "#ccc" },
      bgcolor: CREAM,
      camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } },
    },
    title: {
      text: "Spoon Rating Surface — Ideal bowl proportion = 0.20",
      font: { size: 11, color: "#1a1a1a" },
      x:    0.5,
    },
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: CREAM }}>
      {/* 3D surface plot */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Plot
          data={[surfaceTrace, scatterTrace]}
          layout={layout as Partial<Plotly.Layout>}
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
        />
      </div>

      {/* Data table */}
      <div className="border-t border-warm-black/15 overflow-y-auto shrink-0" style={{ maxHeight: 210 }}>
        <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(26,26,26,0.05)" }}>
              {["Name", "Bowl", "Handle", "Ratio", "Enjoy.", "Material", "Ratio Pref.", "Overall"].map(h => (
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
              <tr key={r.name}
                style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(26,26,26,0.025)",
                  borderBottom: "1px solid rgba(26,26,26,0.06)",
                }}>
                <td className="px-3 py-1.5 font-sans text-[10px]">{r.name}</td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.bowl_length}</td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.handle_length}</td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.bowl_to_handle_ratio.toFixed(2)}</td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.enjoyment.toFixed(2)}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wide text-white"
                    style={{ background: MATERIAL_COLOR[r.material] ?? "#888" }}>
                    {r.material}
                  </span>
                </td>
                <td className="px-3 py-1.5 tabular-nums font-mono">{r.ratio_preference_score.toFixed(2)}</td>
                <td className="px-3 py-1.5 tabular-nums font-mono font-medium">{r.overall_rating.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
