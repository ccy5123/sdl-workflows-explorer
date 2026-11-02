// Seeded random numbers for the simulation (SPEC-SIM-001 design §6.7): mulberry32 per run, seeded with the 32-bit
// MurmurHash3 finalizer of seed XOR (run × 0x9E3779B9), so neighbouring seeds share no runs. Pure.

/** MurmurHash3 32-bit finalizer. */
export function mix32(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Seed of run r (1-based) of a simulation with the given seed. */
export const runSeed = (seed: number, run: number): number => mix32((seed ^ Math.imul(run, 0x9e3779b9)) >>> 0);

/** mulberry32: uniform numbers in [0, 1) from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
