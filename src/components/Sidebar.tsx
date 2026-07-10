import type { Spoon } from "../data/spoons";
import { computeScore, getBadgeColor, BADGE_CLASSES } from "../utils/scoring";

interface Props {
  spoon: Spoon | null;
  onClose: () => void;
}

export default function Sidebar({ spoon, onClose }: Props) {
  if (!spoon) {
    return (
      <div className="flex flex-col gap-4 p-6 text-sm leading-relaxed text-warm-black">
        <p>Click a point on the graph to see a spoon's full score breakdown.</p>
      </div>
    );
  }

  const score = computeScore(spoon.scores);
  const categories = [
    { key: "bowl"      as const, label: "bowl" },
    { key: "enjoyment" as const, label: "enjoyment" },
    { key: "length"    as const, label: "length" },
    { key: "material"  as const, label: "material" },
  ];

  return (
    <div className="flex flex-col text-sm leading-relaxed text-warm-black overflow-y-auto h-full">
      <div className="flex items-start justify-between gap-2 p-5 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase leading-tight">{spoon.name}</h2>
          <p className="text-xs text-warm-black/50 uppercase mt-0.5 tracking-wide">{spoon.material} · {spoon.date}</p>
        </div>
        <button
          onClick={onClose}
          className="text-warm-black hover:opacity-50 transition-opacity text-xl leading-none mt-0.5 shrink-0 font-bold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6">
        <img src={spoon.image} alt={spoon.name} className="w-full object-contain max-h-48" />

        <div className="text-center">
          <span className="text-2xl font-light">{score}/100</span>
        </div>

        <div>
          <p className="text-xs italic font-semibold mb-1">REVIEW</p>
          <p className="text-xs leading-relaxed">{spoon.review}</p>
        </div>

        <div>
          <p className="text-xs italic font-semibold mb-2">SCORE BREAKDOWN</p>
          <div className="flex flex-col gap-1.5">
            {categories.map(({ key, label }) => {
              const val = spoon.scores[key];
              const color = getBadgeColor(val);
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-warm-black/60 w-20 capitalize">{label}</span>
                  <div className="flex-1 h-1.5 bg-warm-black/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        color === "green" ? "bg-[#4a9a4a]" : color === "amber" ? "bg-[#c07a20]" : "bg-[#c03030]"
                      }`}
                      style={{ width: `${(val / 25) * 100}%`, transition: "width 0.4s ease" }}
                    />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_CLASSES[color]}`}>
                    {val}/25
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
