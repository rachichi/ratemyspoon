import { useState } from "react";
import Navbar from "./components/Navbar";
import SpoonCarousel from "./components/SpoonCarousel";
import SpoonGraph3D from "./components/SpoonGraph3D";
import LiveRatingView from "./components/LiveRatingView";
import { spoons as initialSpoons } from "./data/spoons";
import type { Spoon } from "./data/spoons";

type View = "browse" | "graph" | "rate";

export default function App() {
  const [view, setView] = useState<View>("browse");
  const [spoons] = useState<Spoon[]>(initialSpoons);

  return (
    <div className="flex flex-col h-full text-warm-black" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <Navbar />

      {/* View toggle */}
      <div className="flex shrink-0 border-b border-warm-black/10">
        {(["browse", "graph", "rate"] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-5 py-2 text-[10px] tracking-widest uppercase font-bold transition-colors ${
              view === v ? "border-b-2 border-warm-black text-warm-black" : "text-warm-black/40 hover:text-warm-black"
            }`}
          >
            {v === "browse" ? "Rachel's Reviews" : v === "graph" ? "Plot" : "Rate Your Spoon"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {view === "browse" && (
          <SpoonCarousel spoons={spoons} />
        )}
        {view === "graph" && (
          <SpoonGraph3D />
        )}
        {view === "rate" && (
          <LiveRatingView />
        )}
      </div>
    </div>
  );
}
