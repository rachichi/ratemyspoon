# Rate My Spoon

A Letterboxd-for-spoons web app. Browse a collection of rated spoons, explore the scoring surface in 3D, and rate any spoon live using your camera.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or whichever port Vite picks).

## Architecture

`src/data/spoons.ts` is the **single source of truth**. Each spoon stores its three scoring
inputs — `ratio`, `enjoyment`, and `material` — directly as 0–1 values (material is a
keyword). The browse carousel and the 3D graph both read from this one array and score it
with the tiny pure helpers in `spoonScoring.ts`, so adding a spoon in one place makes it show
up everywhere with no geometry or extra lists to keep in sync. The Plotly chart lives in a
standalone `RatingGraph3D` component (transparent, self-sizing) that is reused in two places:
the **Plot** tab (wrapped by `SpoonGraph3D` with an info box + data table) and, bare, in the
**Rate Your Spoon** sidebar.

```
src/
├── App.tsx                      # Root — view router (browse / 3D graph / rate)
├── main.tsx                     # React entry point
│
├── data/
│   └── spoons.ts                # ★ Single source of truth — ratio/enjoyment/material per spoon
│
├── utils/
│   ├── scoring.ts               # Legacy 0–25 per-category scoring (used only by the live view)
│   └── spoonScoring.ts          # 0–1 scoring model — ratioScore / materialScore / overallScore
│
└── components/
    ├── Navbar.tsx                # Header bar
    ├── SpoonCarousel.tsx         # Browse view — image carousel + parallax score tags
    ├── RatingGraph3D.tsx         # Standalone Plotly 3D graph — transparent, self-sizing (also exports `rated`)
    ├── SpoonGraph3D.tsx          # Plot tab — RatingGraph3D + info box + data table
    ├── LiveRatingView.tsx        # Live camera view — hand/face ML inference + real-time scoring
    └── CameraCapture.tsx         # Camera snapshot helper
```

### The scoring model (`src/utils/spoonScoring.ts`)

A spoon's **overall rating is out of 1** — the equal-weight average of three inputs, each
normalised to 0–1:

| Axis | How it scores |
|------|---------------|
| **Ratio** | Peaks at **1.0** when `ratio = 0.20` (20% bowl), falling **linearly** to 0 as it deviates |
| **Enjoyment** | Direct 0–1 input — used as-is |
| **Material** | plastic = 0.0 · wood = 0.5 · metal = 1.0 |

```
ratioScore    = max(0, 1 − |ratio − 0.20| / 0.20)   // 0 at ratio 0.0 or 0.40
overallScore  = (ratioScore + enjoyment + materialScore) / 3
```

`ratio` is stored **directly** on each spoon (no bowl/handle lengths) as the fraction of the
spoon that is bowl — so `ratio = 0.20` means the bowl is 20% of the spoon's length. These
three values also drive the parallax tags in the browse view: `ratio: 0.20`,
`enjoyment: 0.96`, and the `material` keyword.

In the browse carousel, `ratio` also positions the on-image marker: the dot sits at
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
  ratio: 0.20,                    // 0–1: fraction of the spoon that is bowl (0.20 is ideal)
  enjoyment: 0.85,                // 0–1: how much you enjoy using it
  material: "metal",              // "plastic" | "wood" | "metal"
  review: "One-sentence review.",
  date: "2025-11-01",
  location: "Café Nero, Boston",  // where you used the spoon
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Cafe+Nero+Boston", // optional
}
```

That's the whole entry — no bowl/handle lengths, no separate score object. The overall
rating (out of 1) is computed from `ratio`, `enjoyment`, and `material` by `overallScore()`,
and the same three values feed the browse tags and the 3D graph automatically.

**How to choose each value:**

- **`ratio` (0–1)** — eyeball what fraction of the spoon's length is the bowl. A dessert
  spoon is roughly `0.20` (the sweet spot). Go lower (`~0.15`) for long-handled/small-bowl
  spoons and higher (`0.30`+) for ladles or stubby spoons. Remember the score *peaks at
  0.20* and drops off symmetrically, so `0.10` and `0.30` both score about the same.
- **`enjoyment` (0–1)** — your subjective delight. Use `0.9`+ for a spoon you love,
  `~0.5` for "fine", and `<0.3` for something you'd rather not touch.
- **`material`** — one of `"plastic"` (0.0), `"wood"` (0.5), or `"metal"` (1.0). Treat
  stainless steel, silver, etc. as `"metal"`.
- **`location`** — where you used the spoon; shown as "Used at …" under the review.
- **`mapUrl`** *(optional)* — a Google Maps link. When present, the location becomes a
  clickable link (opens in a new tab). Easiest to grab one with the
  `https://www.google.com/maps/search/?api=1&query=<place+name>` format.

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
- **Tag colors:** each 0–1 score colors its tag green (≥ 0.66), amber (≥ 0.33), or red
  below that — a quick sanity check that your `ratio` / `enjoyment` / `material` land where
  you'd expect.

---

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Plotly.js / react-plotly.js (3D graph)
- TensorFlow.js + @tensorflow-models/hand-pose-detection (hand tracking)
- @vladmandic/face-api (smile detection)
