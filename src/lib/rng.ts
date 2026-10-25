/** Seeded PRNG (mulberry32). Same seed, same sequence: the idea the How page explains. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick an index with probability proportional to weights. */
export function weighted(r: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) if ((x -= weights[i]) < 0) return i;
  return weights.length - 1;
}

/** Roughly normal sample (sum of uniforms). */
export function normalish(r: () => number, mean: number, sd: number): number {
  return mean + sd * (r() + r() + r() + r() + r() + r() - 3) / Math.SQRT1_2 / 1.414;
}
