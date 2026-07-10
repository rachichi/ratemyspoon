import type { MaterialType } from "../utils/spoonScoring";

export interface Spoon {
  id: string;
  name: string;
  image: string;
  ratio: number;         // 0–1: fraction of the spoon that is bowl (0.20 is ideal)
  enjoyment: number;     // 0–1: how much you enjoy using it
  material: MaterialType; // "plastic" | "wood" | "metal"
  review: string;
  date: string;
  location: string;      // where you used the spoon
  mapUrl?: string;       // optional Google Maps link for that location
}

export const spoons: Spoon[] = [
  {
    id: "muji-long-spoon",
    name: "Muji Long",
    image: "/spoons/image 65.png",
    ratio: 0.25,
    enjoyment: 0.72,
    material: "metal",
    review: "Tiny bowl, perfect for sauces. The stubby handle loses points but it moves with confidence.",
    date: "2025-09-12",
    location: "Home kitchen",
  },
  {
    id: "plastic-offender",
    name: "Plastic Offender",
    image: "/spoons/image 69.png",
    ratio: 0.33,
    enjoyment: 0.60,
    material: "plastic",
    review: "Absolutely horrendous plastic spoon. Might as well use your hands.",
    date: "2025-10-15",
    location: "Office cafeteria",
  },
  {
    id: "birch-spoon",
    name: "Birch",
    image: "/spoons/image 70.png",
    ratio: 0.20,
    enjoyment: 0.96,
    material: "wood",
    review: "Warm in the hand, beautiful grain. Light in weight — deceptively satisfying to hold.",
    date: "2025-10-01",
    location: "Blue Bottle Coffee, Cambridge",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Blue+Bottle+Coffee+Cambridge",
  },
  {
    id: "the-sterling",
    name: "Sterling",
    image: "/spoons/image 71.png",
    ratio: 0.15,
    enjoyment: 0.92,
    material: "metal",
    review: "Good weight, great length. Almost perfect if not for the dull bowl edges.",
    date: "2025-10-22",
    location: "Grandma's dining room",
  },
  {
    id: "the-victorian",
    name: "Victorian",
    image: "/spoons/image 72.png",
    ratio: 0.21,
    enjoyment: 0.88,
    material: "metal",
    review: "Intricate detailing on every millimetre of the handle. Each use feels ceremonial.",
    date: "2025-11-20",
    location: "The Ritz, London",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=The+Ritz+London",
  },
];
