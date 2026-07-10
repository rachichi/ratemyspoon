// Legacy 0–25 per-category scoring — used only by the live camera-rating view.
export interface SpoonScores {
  bowl: number;       // 0–25
  enjoyment: number;  // 0–25
  length: number;     // 0–25
  material: number;   // 0–25
}

export function computeScore(scores: SpoonScores): number {
  return scores.bowl + scores.enjoyment + scores.length + scores.material;
}

export type BadgeColor = "green" | "amber" | "red";

export function getBadgeColor(score: number): BadgeColor {
  if (score >= 20) return "green";
  if (score >= 10) return "amber";
  return "red";
}

export const BADGE_CLASSES: Record<BadgeColor, string> = {
  green: "bg-[#d0edcc] text-[#2d6b2d]",
  amber: "bg-[#fde8c4] text-[#7a4a10]",
  red:   "bg-[#f5c6c6] text-[#8b2121]",
};
