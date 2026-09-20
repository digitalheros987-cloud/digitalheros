/**
 * Mulberry32 seeded pseudo-random number generator (PRNG).
 * Provides deterministic 32-bit floating-point numbers between [0, 1) from an initial seed.
 * Enables 100% historical reproducibility and testability of draws.
 */
export class PRNG {
  private state: number;

  constructor(seedStr?: string) {
    if (!seedStr) {
      this.state = (Math.random() * 0xffffffff) >>> 0;
    } else {
      // Hash string seed to 32-bit integer
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
      }
      this.state = h >>> 0;
    }
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Draws k unique numbers without replacement from [min, max]
   */
  drawUnique(count: number, min: number, max: number): number[] {
    const rangeSize = max - min + 1;
    if (count > rangeSize) {
      throw new Error(`Cannot draw ${count} unique numbers from range of size ${rangeSize}`);
    }

    const pool = Array.from({ length: rangeSize }, (_, i) => min + i);
    const result: number[] = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(this.next() * pool.length);
      result.push(pool[idx]);
      pool.splice(idx, 1);
    }

    return result.sort((a, b) => a - b);
  }
}
