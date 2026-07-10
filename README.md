# Rate My Spoon

A Letterboxd-for-spoons web app. Browse a collection of rated spoons, explore the scoring surface in 3D, and rate any spoon live using your camera.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or whichever port Vite picks).

## Architecture

```
src/
├── App.tsx                      # Root — view router (browse / 3D graph / rate)
├── main.tsx                     # React entry point
│
├── data/
│   ├── spoons.ts                # Static spoon collection (browse view)
│   └── graphSpoons.ts           # Spoon measurements for the 3D graph (edit to add spoons)
│
├── utils/
│   ├── scoring.ts               # Legacy 0–25 per-category scoring (used by browse + live view)
│   └── spoonScoring.ts          # Physics-based scoring model (used by 3D graph)
│
└── components/
    ├── Navbar.tsx                # Header bar
    ├── SpoonCarousel.tsx         # Browse view — image carousel + score badges
    ├── SpoonGraph3D.tsx          # 3D graph view — Plotly surface + scatter + data table
    ├── MiniRatingGraph.tsx       # SVG mini chart shown in the live-rating sidebar
    ├── LiveRatingView.tsx        # Live camera view — hand/face ML inference + real-time scoring
    ├── Sidebar.tsx               # Detail panel for selected spoon in graph view
    ├── RatingPanel.tsx           # Manual rating form
    └── CameraCapture.tsx         # Camera snapshot helper
```

### Scoring model (`src/utils/spoonScoring.ts`)

Each spoon is scored on three equally weighted axes (all normalised 0–1):

| Axis | Formula |
|------|---------|
| **Bowl proportion** | `bowl_length / (bowl_length + handle_length)` → distance from ideal ratio 0.20 |
| **Enjoyment** | Direct 0–1 input |
| **Material** | plastic = 0.0 · wood = 0.5 · metal = 1.0 |

```
ratio_preference_score = max(0, 1 − |ratio − 0.20| / 0.20)
overall_rating = (ratio_preference_score + enjoyment + material_rating) / 3
```

The ideal spoon is 20% bowl / 80% handle. Scores fall off linearly as the ratio deviates from that.

### Live rating view

Uses TensorFlow.js (MediaPipe Hands, tfjs runtime) to detect the hand holding a spoon and estimate spoon geometry from hand keypoints + a brightness scan above the fingertips. Face expressions (smile → enjoyment) are detected with `@vladmandic/face-api` (TinyFaceDetector).

---

## Adding spoons to the 3D graph

Edit `src/data/graphSpoons.ts` and add an entry to the `GRAPH_SPOONS` array:

```ts
{ name: "My New Spoon", bowl_length: 4, handle_length: 16, enjoyment: 0.85, material: "metal" }
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name |
| `bowl_length` | number > 0 | Any unit — only the ratio matters |
| `handle_length` | number > 0 | Same unit as bowl_length |
| `enjoyment` | 0–1 | How much you enjoy using it |
| `material` | `"plastic"` \| `"wood"` \| `"metal"` | Case-insensitive |

The derived fields (`bowl_to_handle_ratio`, `ratio_preference_score`, `material_rating`, `overall_rating`) are computed automatically in `computeSpoonRating()`.

---

## Adding spoons to the browse carousel

Edit `src/data/spoons.ts` and add an entry to the `spoons` array. Place the spoon image in `public/spoons/`:

```ts
{
  id: "my-spoon",
  name: "My Spoon",
  image: "/spoons/my-spoon.png",
  scores: { bowl: 22, enjoyment: 20, length: 18, material: 25 },
  review: "One sentence review.",
  material: "stainless steel",
  date: "2025-11-01",
}
```

Scores use the legacy 0–25 per-category scale (total max 100).

---

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Plotly.js / react-plotly.js (3D graph)
- TensorFlow.js + @tensorflow-models/hand-pose-detection (hand tracking)
- @vladmandic/face-api (smile detection)
