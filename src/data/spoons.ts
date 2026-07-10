export interface SpoonScores {
  bowl: number;       // 0–25: bowl size and shape quality
  enjoyment: number;  // 0–25: overall aesthetic enjoyment
  length: number;     // 0–25: handle length quality
  material: number;   // 0–25: material quality
}

export interface Spoon {
  id: string;
  name: string;
  image: string;
  scores: SpoonScores;
  review: string;
  material: string;
  date: string;
}

export const spoons: Spoon[] = [
  {
    id: "sauce-ladle",
    name: "The Sauce Ladle",
    image: "/spoons/image 65.png",
    scores: { bowl: 20, enjoyment: 18, length: 12, material: 22 },
    review: "Tiny bowl, perfect for sauces. The stubby handle loses points but it moves with confidence.",
    material: "stainless steel",
    date: "2025-09-12",
  },
  {
    id: "birch-spoon",
    name: "The Birch Spoon",
    image: "/spoons/image 69.png",
    scores: { bowl: 22, enjoyment: 24, length: 20, material: 18 },
    review: "Warm in the hand, beautiful grain. Light in weight — deceptively satisfying to hold.",
    material: "wood",
    date: "2025-10-01",
  },
  {
    id: "plastic-offender",
    name: "The Plastic Offender",
    image: "/spoons/image 70.png",
    scores: { bowl: 15, enjoyment: 15, length: 15, material: 0 },
    review: "Absolutely horrendous plastic spoon. Might as well use your hands.",
    material: "plastic",
    date: "2025-10-15",
  },
  {
    id: "the-sterling",
    name: "The Sterling",
    image: "/spoons/image 71.png",
    scores: { bowl: 25, enjoyment: 23, length: 25, material: 25 },
    review: "Good weight, great length. Almost perfect if not for the dull bowl edges.",
    material: "stainless steel",
    date: "2025-10-22",
  },
  {
    id: "the-victorian",
    name: "The Victorian",
    image: "/spoons/image 72.png",
    scores: { bowl: 24, enjoyment: 22, length: 23, material: 25 },
    review: "Intricate detailing on every millimetre of the handle. Each use feels ceremonial.",
    material: "silver",
    date: "2025-11-20",
  },
];
