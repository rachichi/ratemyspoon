export type MaterialType = "plastic" | "wood" | "metal";

export interface SpoonMeasurement {
  name: string;
  bowl_length: number;
  handle_length: number;
  enjoyment: number;   // 0–1
  material: MaterialType;
}

export interface SpoonRating extends SpoonMeasurement {
  bowl_to_handle_ratio: number;
  ratio_preference_score: number;
  material_rating: number;
  overall_rating: number;
}

export const IDEAL_RATIO = 0.2;

const MATERIAL_SCORES: Record<MaterialType, number> = {
  plastic: 0.0,
  wood:    0.5,
  metal:   1.0,
};

export function computeSpoonRating(spoon: SpoonMeasurement): SpoonRating {
  if (spoon.bowl_length <= 0)   throw new Error("bowl_length must be > 0");
  if (spoon.handle_length <= 0) throw new Error("handle_length must be > 0");
  if (spoon.enjoyment < 0 || spoon.enjoyment > 1) throw new Error("enjoyment must be 0–1");

  const mat = spoon.material.toLowerCase() as MaterialType;
  if (!(mat in MATERIAL_SCORES)) throw new Error(`Unsupported material: ${spoon.material}`);

  const bowl_to_handle_ratio = spoon.bowl_length / (spoon.bowl_length + spoon.handle_length);
  // Peaks at IDEAL_RATIO=0.2; falls to 0 at distance of IDEAL_RATIO away
  const ratio_preference_score = Math.max(0, Math.min(1,
    1 - Math.abs(bowl_to_handle_ratio - IDEAL_RATIO) / IDEAL_RATIO,
  ));
  const material_rating = MATERIAL_SCORES[mat];
  const overall_rating  = Math.max(0, Math.min(1,
    (ratio_preference_score + spoon.enjoyment + material_rating) / 3,
  ));

  return { ...spoon, material: mat, bowl_to_handle_ratio, ratio_preference_score, material_rating, overall_rating };
}

// Surface helper: overall_rating for any (ratio, enjoyment, materialRating) without a full SpoonMeasurement
export function ratingFromParams(ratio: number, enjoyment: number, materialRating: number): number {
  const rps = Math.max(0, Math.min(1, 1 - Math.abs(ratio - IDEAL_RATIO) / IDEAL_RATIO));
  return Math.max(0, Math.min(1, (rps + enjoyment + materialRating) / 3));
}

/* ------------------------------------------------------------------ *
 * Direct-input model — used by the browse carousel and the 3D graph.
 * Spoons in src/data/spoons.ts store ratio, enjoyment, and material
 * directly (0–1), so these helpers score them without any geometry.
 * ------------------------------------------------------------------ */

// Ratio preference: 1.0 at the ideal 0.20, falling linearly to 0 a full 0.20 away.
export function ratioScore(ratio: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(ratio - IDEAL_RATIO) / IDEAL_RATIO));
}

// Material rating: plastic = 0.0, wood = 0.5, metal = 1.0.
export function materialScore(material: MaterialType): number {
  return MATERIAL_SCORES[material] ?? 0;
}

// Overall rating (0–1): equal-weight average of ratio, enjoyment, and material.
export function overallScore(s: { ratio: number; enjoyment: number; material: MaterialType }): number {
  return Math.max(0, Math.min(1, (ratioScore(s.ratio) + s.enjoyment + materialScore(s.material)) / 3));
}

export type ScoreColor = "green" | "amber" | "red";

// Traffic-light color for any 0–1 score (metal/wood/plastic land on green/amber/red).
export function scoreColor(score: number): ScoreColor {
  if (score >= 0.66) return "green";
  if (score >= 0.33) return "amber";
  return "red";
}
