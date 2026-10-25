// Small statistics helpers for the How page. Plain formulas, no dependencies.

export const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Sample standard deviation (n − 1 in the denominator). */
export function sd(v: number[]) {
  const m = mean(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
}

export const normalPdf = (x: number, mu: number, s: number) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

function lgamma(x: number): number {
  // Lanczos approximation
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-16, FPMIN = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  return x < (a + 1) / (a + b + 2) ? Math.exp(lbt + Math.log(betacf(a, b, x)) - Math.log(a)) : 1 - Math.exp(lbt + Math.log(betacf(b, a, 1 - x)) - Math.log(b));
}

/** Two-sided p-value for Student's t with `df` degrees of freedom. */
export const tTwoSided = (t: number, df: number) => ibeta(df / (df + t * t), df / 2, 0.5);

/** Paired t-test on per-replicate differences. */
export function pairedT(a: number[], b: number[]) {
  const d = a.map((x, i) => x - b[i]);
  const n = d.length, dbar = mean(d), sdd = sd(d), se = sdd / Math.sqrt(n), t = dbar / se;
  return { n, dbar, sdd, se, t, df: n - 1, p: tTwoSided(t, n - 1), cohen: dbar / sdd };
}

/** "3.2 × 10^{-12}" style TeX for tiny p-values. */
export function texP(p: number): string {
  if (p >= 0.001) return p.toFixed(3);
  if (p < 1e-300) return '10^{-300}';
  const e = Math.floor(Math.log10(p));
  return `${(p / 10 ** e).toFixed(1)} \\times 10^{${e}}`;
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, error < 1.5e-7). */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Inverse standard normal CDF by bisection (plenty fast for a handful of calls). */
export function normInv(p: number): number {
  let lo = -8, hi = 8;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (normCdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** One-sample t-test of H0: mean ≤ target against H1: mean > target. */
export function oneSampleT(v: number[], target: number) {
  const n = v.length, m = mean(v), s = sd(v), se = s / Math.sqrt(n), t = (m - target) / se;
  const two = tTwoSided(t, n - 1);
  return { n, m, s, se, t, df: n - 1, pAbove: t > 0 ? two / 2 : 1 - two / 2, pBelow: t < 0 ? two / 2 : 1 - two / 2 };
}
