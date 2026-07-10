import { useState } from "react";
import type { SpoonScores } from "../data/spoons";
import { computeScore, getBadgeColor, BADGE_CLASSES } from "../utils/scoring";
import CameraCapture from "./CameraCapture";

interface Props {
  onSave: (scores: SpoonScores, review: string, imageDataUrl: string, name: string) => void;
}

const INITIAL_SCORES: SpoonScores = { bowl: 12, enjoyment: 12, length: 12, material: 12 };

export default function RatingPanel({ onSave }: Props) {
  const [scores, setScores] = useState<SpoonScores>(INITIAL_SCORES);
  const [review, setReview] = useState("");
  const [name, setName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const score = computeScore(scores);
  const categories: (keyof SpoonScores)[] = ["bowl", "enjoyment", "length", "material"];

  function handleCapture(dataUrl: string) {
    setImageDataUrl(dataUrl);
    setShowCamera(false);
  }

  function handleSave() {
    if (!imageDataUrl || !name.trim()) return;
    onSave(scores, review, imageDataUrl, name.trim());
  }

  if (showCamera) {
    return <CameraCapture onCapture={handleCapture} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6 text-sm leading-relaxed text-warm-black max-w-lg mx-auto">
      <div>
        <p className="text-xs italic font-semibold mb-2 uppercase">Spoon Name</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. The Sterling"
          className="w-full border border-warm-black/30 px-3 py-2 text-xs bg-transparent focus:outline-none focus:border-warm-black"
        />
      </div>

      {/* Photo */}
      <div>
        <p className="text-xs italic font-semibold mb-2 uppercase">Photo</p>
        {imageDataUrl ? (
          <div className="relative">
            <img src={imageDataUrl} alt="Captured spoon" className="w-full max-h-64 object-contain border border-warm-black/20" />
            <button
              onClick={() => setShowCamera(true)}
              className="mt-2 text-xs text-warm-black/50 hover:text-warm-black transition-colors underline"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full border border-warm-black/30 border-dashed py-8 text-xs text-warm-black/40 hover:text-warm-black hover:border-warm-black transition-colors uppercase tracking-widest"
          >
            Open Camera
          </button>
        )}
      </div>

      {/* Sliders */}
      <div>
        <p className="text-xs italic font-semibold mb-3 uppercase">Score Breakdown</p>
        <div className="flex flex-col gap-4">
          {categories.map(cat => {
            const val = scores[cat];
            const color = getBadgeColor(val);
            return (
              <div key={cat} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs capitalize">{cat}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_CLASSES[color]}`}>{val}/25</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={val}
                  onChange={e => setScores(prev => ({ ...prev, [cat]: Number(e.target.value) }))}
                  className="w-full accent-warm-black"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Live total */}
      <div className="text-center">
        <span className="text-2xl font-light">{score}/100</span>
      </div>

      {/* Review */}
      <div>
        <p className="text-xs italic font-semibold mb-2 uppercase">Review</p>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          placeholder="Your thoughts on this spoon..."
          rows={3}
          className="w-full border border-warm-black/30 px-3 py-2 text-xs bg-transparent focus:outline-none focus:border-warm-black resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!imageDataUrl || !name.trim()}
        className="border border-warm-black/80 px-6 py-2 text-xs tracking-widest uppercase hover:bg-warm-black hover:text-cream transition-colors disabled:opacity-30"
      >
        Save Spoon
      </button>
    </div>
  );
}
