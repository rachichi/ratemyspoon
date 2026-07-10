import { useState } from "react";
import Plot from "react-plotly.js";
import type { Spoon } from "../data/spoons";
import { computeScore } from "../utils/scoring";
import Sidebar from "./Sidebar";

interface Props {
  spoons: Spoon[];
}

type Axis = "bowl" | "enjoyment" | "length" | "material";
const AXIS_OPTIONS: Axis[] = ["bowl", "enjoyment", "length", "material"];

export default function SpoonGraph3D({ spoons }: Props) {
  const [axes, setAxes] = useState<[Axis, Axis, Axis]>(["bowl", "enjoyment", "length"]);
  const [selected, setSelected] = useState<Spoon | null>(null);

  function cycleAxis(slot: 0 | 1 | 2, dir: 1 | -1) {
    const current = AXIS_OPTIONS.indexOf(axes[slot]);
    const next = (current + dir + AXIS_OPTIONS.length) % AXIS_OPTIONS.length;
    const newAxes = [...axes] as [Axis, Axis, Axis];
    newAxes[slot] = AXIS_OPTIONS[next]!;
    setAxes(newAxes);
  }

  const data: Plotly.Data[] = [{
    type: "scatter3d",
    mode: "markers+text",
    x: spoons.map(s => s.scores[axes[0]]),
    y: spoons.map(s => s.scores[axes[1]]),
    z: spoons.map(s => s.scores[axes[2]]),
    text: spoons.map(s => s.name),
    textposition: "top center",
    marker: {
      size: spoons.map(s => 6 + computeScore(s.scores) / 20),
      color: spoons.map(s => computeScore(s.scores)),
      colorscale: "RdYlGn",
      cmin: 0,
      cmax: 100,
      opacity: 0.9,
    },
    customdata: spoons.map((_, i) => i),
  }];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: "#f5ede0",
    plot_bgcolor: "#f5ede0",
    font: { family: "Helvetica Neue, Helvetica, Arial, sans-serif", size: 10, color: "#1a1a1a" },
    margin: { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      xaxis: { title: axes[0], gridcolor: "#ccc" },
      yaxis: { title: axes[1], gridcolor: "#ccc" },
      zaxis: { title: axes[2], gridcolor: "#ccc" },
      bgcolor: "#f5ede0",
    },
  };

  function handleClick(event: Readonly<Plotly.PlotMouseEvent>) {
    const pt = event.points[0];
    if (pt === undefined) return;
    const idx = pt.customdata as number;
    setSelected(spoons[idx] ?? null);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 relative">
        {/* Axis toggle controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 text-xs tracking-widest uppercase">
          {([0, 1, 2] as const).map(slot => (
            <div key={slot} className="flex items-center gap-1 border border-warm-black/20 px-2 py-1" style={{ background: "rgba(245,237,224,0.9)" }}>
              <button onClick={() => cycleAxis(slot, -1)} className="hover:opacity-50">‹</button>
              <span className="w-16 text-center">{axes[slot]}</span>
              <button onClick={() => cycleAxis(slot, 1)} className="hover:opacity-50">›</button>
            </div>
          ))}
        </div>

        <Plot
          data={data}
          layout={layout}
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false, responsive: true }}
          onClick={handleClick}
        />
      </div>

      <div className="w-72 shrink-0 border-l border-warm-black/20 overflow-y-auto">
        <Sidebar spoon={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
