export type RandomSource = () => number;

export function selectRandomIndex(count: number, random: RandomSource = Math.random): number {
  if (!Number.isInteger(count) || count < 1) throw new Error("At least one eligible participant is required.");
  const sample = random();
  if (!Number.isFinite(sample)) throw new Error("The random source returned an invalid value.");
  const normalized = Math.max(0, Math.min(1 - Number.EPSILON, sample));
  return Math.floor(normalized * count);
}
