// Stub: CLIP embedding via @xenova/transformers (client-side, no API key needed)
// Computes cosine distance against stored embeddings to derive uniqueness score.

export type Embedding = number[];

export async function embedSpoonImage(_imageUrl: string): Promise<Embedding> {
  // TODO: load Xenova/clip-vit-base-patch32, run inference on cropped spoon image
  return [];
}

export function cosineDistance(a: Embedding, b: Embedding): number {
  if (a.length === 0 || b.length === 0) return 1;
  const dot = a.reduce((sum, v, i) => sum + v * b[i]!, 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return 1 - dot / (normA * normB);
}

export function uniquenessScore(newEmbedding: Embedding, existingEmbeddings: Embedding[]): number {
  if (existingEmbeddings.length === 0 || newEmbedding.length === 0) return 12;
  const distances = existingEmbeddings.map(e => cosineDistance(newEmbedding, e));
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  return Math.round(Math.min(25, avgDistance * 50));
}
