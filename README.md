# Rate My Spoon

A Letterboxd-for-spoons web app. Browse a collection of rated spoons, explore the scoring surface in 3D, and rate any spoon live using your camera.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or whichever port Vite picks).

## Architecture

`src/data/spoons.ts` is the **single source of truth**. Both the browse carousel and the
3D graph read from this one array — the graph maps each spoon through
`computeSpoonRating()` at runtime, so adding a spoon in one place makes it show up
everywhere. There is no longer a separate list to keep in sync for the main graph.

```
src/
├── App.tsx                      # Root — view router (browse / 3D graph / rate)
├── main.tsx                     # React entry point
│
├── data/
│   ├── spoons.ts                # ★ Single source of truth — powers browse AND the 3D graph
│   └── graphSpoons.ts           # Legacy sample set — only feeds the live-view MiniRatingGraph
│
├── utils/
│   ├── scoring.ts               # Legacy 0–25 per-category scoring (browse badges + live view)
│   └── spoonScoring.ts          # Physics-based scoring model (3D graph + live view)
│
└── components/
    ├── Navbar.tsx                # Header bar
    ├── SpoonCarousel.tsx         # Browse view — image carousel + parallax score badges
    ├── SpoonGraph3D.tsx          # 3D graph view — derives ratings from spoons.ts via computeSpoonRating()
    ├── MiniRatingGraph.tsx       # SVG mini chart shown in the live-rating sidebar (uses graphSpoons.ts)
    ├── LiveRatingView.tsx        # Live camera view — hand/face ML inference + real-time scoring
    ├── Sidebar.tsx               # Detail panel for selected spoon in graph view
    ├── RatingPanel.tsx           # Manual rating form
    └── CameraCapture.tsx         # Camera snapshot helper
```

### How the ratio is calculated (`src/utils/spoonScoring.ts`)

The **bowl-to-handle ratio** is the fraction of the whole spoon taken up by the bowl:

```
bowl_to_handle_ratio = bowl_length / (bowl_length + handle_length)
```

The ideal spoon is **20% bowl / 80% handle** (`IDEAL_RATIO = 0.20`). A spoon earns a
full ratio score at exactly 0.20 and falls off **linearly** the further it strays, hitting
0 once it is a full 0.20 away from ideal (i.e. at ratio 0.0 or 0.40):

```
ratio_preference_score = max(0, min(1, 1 − |ratio − 0.20| / 0.20))
```

This score is one of three equally weighted axes, all normalised 0–1:

| Axis | Formula |
|------|---------|
| **Ratio** | `max(0, 1 − |ratio − 0.20| / 0.20)` |
| **Enjoyment** | Direct 0–1 input (in `spoons.ts` this is `scores.enjoyment / 25`) |
| **Material** | plastic = 0.0 · wood = 0.5 · metal = 1.0 |

```
overall_rating = (ratio_preference_score + enjoyment + material_rating) / 3
```

In the browse carousel, the ratio also drives the on-image marker: the dot is placed at
`top + ratio × height` down the spoon, marking the bowl/handle "neck". **This only lines up
if the image is cropped flush to the top and bottom of the spoon** (see below).

### Live rating view

Uses TensorFlow.js (MediaPipe Hands, tfjs runtime) to detect the hand holding a spoon and estimate spoon geometry from hand keypoints + a brightness scan above the fingertips. Face expressions (smile → enjoyment) are detected with `@vladmandic/face-api` (TinyFaceDetector).

---

## Adding a spoon

Add one entry to the `spoons` array in `src/data/spoons.ts` and drop its image in
`public/spoons/`. This single entry powers **both** the browse carousel and the 3D graph.

```ts
{
  id: "my-spoon",                 // unique kebab-case slug
  name: "My Spoon",               // display name
  image: "/spoons/my-spoon.png",  // path under public/
  scores: { bowl: 22, enjoyment: 20, length: 18, material: 25 }, // 0–25 each (browse badges)
  review: "One-sentence review.",
  material: "stainless steel",    // free text for the browse card
  date: "2025-11-01",
  bowl_length: 4,                 // used for the ratio — any unit, only the proportion matters
  handle_length: 16,              // same unit as bowl_length
}
```

The 3D graph derives its physics-based rating from `bowl_length`, `handle_length`,
`scores.enjoyment / 25`, and `material` — so make sure those are set. The material string
is normalised to `plastic` / `wood` / `metal` (anything not plastic/wood is treated as metal).
Derived fields (`bowl_to_handle_ratio`, `ratio_preference_score`, `material_rating`,
`overall_rating`) are computed automatically in `computeSpoonRating()`.

### Image requirements

- **Crop flush to the top and bottom of the spoon.** The bowl must touch the top edge and
  the handle tip must touch the bottom edge, with no padding. The ratio marker is positioned
  by fraction of image height, so any empty space above or below throws the dot off the neck.
- **Orientation:** vertical, bowl at the top, handle pointing down.
- **Recommended size:** ~600 × 1600 px (a tall ~3:8 portrait), transparent PNG.
- **Background:** transparent (or a clean solid) so it sits cleanly on the cream canvas.
- **File size:** keep under ~300 KB; these load eagerly in the carousel.

### Recommended content

- **`review`:** one sentence, roughly **60–120 characters**. It renders on a single
  centered line under the carousel, so anything longer wraps awkwardly.
- **`name`:** short enough to fit a badge — aim for **≤ 24 characters**.
- **`scores`:** each category is 0–25 (total out of 100). Use the same 20 / 10 thresholds the
  badges color by (≥20 green, ≥10 amber, else red) as a sanity check.

---

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Plotly.js / react-plotly.js (3D graph)
- TensorFlow.js + @tensorflow-models/hand-pose-detection (hand tracking)
- @vladmandic/face-api (smile detection)
