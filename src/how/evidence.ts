// Turns summary files into the numbers the "What we found" part of the How page shows.
// Summaries hold a mean and 95% interval per group, not the 100 individual runs, so the runs are
// re-created here as draws with that mean and spread: sd ≈ (ci_high − ci_low) / 3.92.
// Swap in the real per-replicate values once psim-tools analyze writes them.
import { normalish, rng } from '../lib/rng';
import { pairedT } from '../lib/stats';
import { GROUP_LABEL } from '../lib/format';
import type { Bundle, Comparison, Dimension, Interval, MetricKey } from '../lib/types';

export const N_REP = 100;

export function metric(b: Bundle, dim: Dimension, value: string, m: MetricKey): Interval {
  const g = b.groupMetrics.groups.find((x) => x.dimension === dim && x.value === value);
  if (!g) throw new Error(`no ${dim}=${value}`);
  return g.metrics[m];
}

/** 100 per-run values consistent with a summary interval. Percent for failure rates. */
export function runs(iv: Interval, seed: number, pct = false): number[] {
  const k = pct ? 100 : 1;
  const s = ((iv.ci_high - iv.ci_low) / 3.92) * k;
  const r = rng(seed);
  return Array.from({ length: N_REP }, () => normalish(r, iv.mean * k, s));
}

export interface Test {
  key: string; hyp: string; title: string; question: string; unit: string;
  a: { label: string; runs: number[] }; b: { label: string; runs: number[] };
  meaningful: number; // smallest gap we'd call meaningful in real life, in `unit`
}

export function tests(b: Bundle): Test[] {
  const F = (dim: Dimension, v: string, seed: number) => runs(metric(b, dim, v, 'failure_rate'), seed, true);
  const T = (dim: Dimension, v: string, seed: number) => runs(metric(b, dim, v, 'total_minutes'), seed);
  const hoods = [...b.hoods.features].sort((x, y) => y.properties.metrics.failure_rate.mean - x.properties.metrics.failure_rate.mean);
  // two neighborhoods with the closest failure rates: an example of "no detectable difference"
  let pair = [hoods[0], hoods[1]], gap = Infinity;
  for (let i = 0; i < hoods.length - 1; i++) {
    const d = Math.abs(hoods[i].properties.metrics.failure_rate.mean - hoods[i + 1].properties.metrics.failure_rate.mean);
    if (d < gap) { gap = d; pair = [hoods[i], hoods[i + 1]]; }
  }
  return [
    { key: 'h2', hyp: 'H2', title: 'Shift workers vs undergraduates', question: 'Do shift workers get stranded more often than undergraduates?', unit: '%',
      a: { label: GROUP_LABEL.shift_worker, runs: F('group', 'shift_worker', 1) }, b: { label: GROUP_LABEL.undergraduate, runs: F('group', 'undergraduate', 2) }, meaningful: 2 },
    { key: 'h1', hyp: 'H1', title: 'Resident workers vs undergraduates', question: 'Do resident workers spend longer getting where they need to go?', unit: 'min',
      a: { label: GROUP_LABEL.resident_worker, runs: T('group', 'resident_worker', 3) }, b: { label: GROUP_LABEL.undergraduate, runs: T('group', 'undergraduate', 4) }, meaningful: 5 },
    { key: 'hood', hyp: 'H4', title: `${pair[0].properties.name} vs ${pair[1].properties.name}`, question: 'Are these two neighborhoods served differently?', unit: '%',
      a: { label: pair[0].properties.name, runs: F('neighborhood', pair[0].properties.neighborhood, 5) }, b: { label: pair[1].properties.name, runs: F('neighborhood', pair[1].properties.neighborhood, 6) }, meaningful: 2 },
  ];
}

export type Status = 'Supported' | 'Not supported' | 'Mixed';
export interface Verdict { id: string; claim: string; status: Status; evidence: string }

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const min = (v: number) => `${v.toFixed(0)} min`;
const sig = (a: number[], b: number[]) => pairedT(a, b).p < 0.05;

export function verdicts(aa: Bundle, mad: Bundle | undefined, comp: Comparison | null): Verdict[] {
  const g = (v: string, m: MetricKey) => metric(aa, 'group', v, m);
  const groups = Object.keys(GROUP_LABEL);
  const out: Verdict[] = [];

  // H1
  {
    const tt = sig(runs(g('resident_worker', 'total_minutes'), 11), runs(g('undergraduate', 'total_minutes'), 12)) && g('resident_worker', 'total_minutes').mean > g('undergraduate', 'total_minutes').mean;
    const ff = sig(runs(g('resident_worker', 'failure_rate'), 13, true), runs(g('undergraduate', 'failure_rate'), 14, true)) && g('resident_worker', 'failure_rate').mean > g('undergraduate', 'failure_rate').mean;
    out.push({ id: 'H1', claim: 'Undergraduates have shorter trips and fewer failures than resident workers.', status: tt && ff ? 'Supported' : tt || ff ? 'Mixed' : 'Not supported',
      evidence: `Travel time ${min(g('undergraduate', 'total_minutes').mean)} vs ${min(g('resident_worker', 'total_minutes').mean)}; failures ${pct(g('undergraduate', 'failure_rate').mean)} vs ${pct(g('resident_worker', 'failure_rate').mean)}. Distance is not yet controlled for.` });
  }
  // H2
  {
    const sorted = [...groups].sort((x, y) => g(y, 'failure_rate').mean - g(x, 'failure_rate').mean);
    const top = sorted[0] === 'shift_worker';
    const clear = top && sig(runs(g(sorted[0], 'failure_rate'), 21, true), runs(g(sorted[1], 'failure_rate'), 22, true));
    out.push({ id: 'H2', claim: 'Shift workers have the highest failure rate, driven by evening and night service.', status: clear ? 'Supported' : top ? 'Mixed' : 'Not supported',
      evidence: `Highest failure rate: ${GROUP_LABEL[sorted[0]].toLowerCase()} at ${pct(g(sorted[0], 'failure_rate').mean)}, next ${GROUP_LABEL[sorted[1]].toLowerCase()} at ${pct(g(sorted[1], 'failure_rate').mean)}.` });
  }
  // H3
  {
    const avg = (vs: string[], m: MetricKey) => vs.reduce((a, v) => a + g(v, m).mean, 0) / vs.length;
    const closer = (m: MetricKey) => Math.abs(g('university_staff', m).mean - avg(['undergraduate', 'graduate'], m)) < Math.abs(g('university_staff', m).mean - avg(['resident_worker', 'shift_worker', 'retired'], m));
    const n = +closer('total_minutes') + +closer('failure_rate');
    out.push({ id: 'H3', claim: 'University staff sit closer to students than to other residents.', status: n === 2 ? 'Supported' : n === 1 ? 'Mixed' : 'Not supported',
      evidence: `Staff travel time ${min(g('university_staff', 'total_minutes').mean)}: students average ${min(avg(['undergraduate', 'graduate'], 'total_minutes'))}, other residents ${min(avg(['resident_worker', 'shift_worker', 'retired'], 'total_minutes'))}.` });
  }
  // H4
  {
    const hf = aa.hoods.features.map((f) => f.properties.metrics.failure_rate.mean);
    const spread = Math.max(...hf) - Math.min(...hf);
    const groupGap = g('resident_worker', 'failure_rate').mean - g('undergraduate', 'failure_rate').mean;
    out.push({ id: 'H4', claim: 'Neighborhood differences are as large as student–resident differences.', status: spread >= groupGap ? 'Supported' : spread >= groupGap * 0.6 ? 'Mixed' : 'Not supported',
      evidence: `Best to worst neighborhood: ${(spread * 100).toFixed(1)} points. Resident workers vs undergraduates: ${(groupGap * 100).toFixed(1)} points.` });
  }
  // H5
  if (mad) {
    const ratio = (b: Bundle) => metric(b, 'group', 'shift_worker', 'failure_rate').mean / metric(b, 'group', 'undergraduate', 'failure_rate').mean;
    const ra = ratio(aa), rm = ratio(mad);
    out.push({ id: 'H5', claim: 'The comparison city shows a different gap, so Ann Arbor’s is not inevitable.', status: Math.abs(ra - rm) / ra > 0.25 ? 'Supported' : 'Not supported',
      evidence: `Shift workers fail ${ra.toFixed(1)}× as often as undergraduates in Ann Arbor, ${rm.toFixed(1)}× in Madison.` });
  }
  // H6
  if (comp) {
    const d = (v: string) => comp.groups.find((x) => x.dimension === 'group' && x.value === v)!.deltas.failure_rate;
    const worst = [...groups].sort((x, y) => g(y, 'failure_rate').mean - g(x, 'failure_rate').mean).slice(0, 2);
    const helped = worst.every((v) => d(v).ci_high < 0);
    const hurt = groups.filter((v) => d(v).ci_low > 0.005);
    out.push({ id: 'H6', claim: 'A targeted redesign helps the worst-served groups without hurting others.', status: helped && !hurt.length ? 'Supported' : helped ? 'Mixed' : 'Not supported',
      evidence: `${worst.map((v) => `${GROUP_LABEL[v]}: ${(d(v).delta * 100).toFixed(1)} pts`).join('; ')}. ${hurt.length ? `Worse for ${hurt.map((v) => GROUP_LABEL[v].toLowerCase()).join(', ')}.` : 'No group gets meaningfully worse.'}` });
  }
  return out;
}
