// Turns summary files into the numbers the "What we found" part of the How page shows.
// Summaries hold a mean and 95% interval per group, not the individual runs, so the runs are
// re-created here as draws with that mean and spread: sd ≈ (ci_high − ci_low) / 3.92, one draw per
// replicate the summary was built from. Swap in the real per-replicate values once psim-tools analyze writes them.
// Anything the summaries don't have yet (a scenario, a city, a metric that is null) comes back as null
// or as a "Pending" verdict, never as an exception.
import { normalish, rng } from '../lib/rng';
import { oneSampleT, pairedT } from '../lib/stats';
import { GROUP_LABEL, label } from '../lib/format';
import { groupMetric, metricOf } from '../lib/metrics';
import type { Comparison, Dimension, GroupMetrics, Interval, MetricKey } from '../lib/types';

/** Neighborhoods with fewer simulated residents than this are too noisy to single out. */
export const MIN_RESIDENTS = 10;

export function metric(gm: GroupMetrics, dim: Dimension, value: string, m: MetricKey): Interval | null {
  return groupMetric(gm, dim, value, m);
}

/** On-time rate for a group, or null until the delay model has run (SCHEMA.md §5.1). */
export function onTime(gm: GroupMetrics, group: string): Interval | null {
  return groupMetric(gm, 'group', group, 'on_time_rate');
}
export const RELIABLE = 95; // % of class trips on time that we call "reliable", fixed in advance

/** How many runs to re-create: as many as the summary was built from (at least 2, for a spread). */
export const nRuns = (gm: GroupMetrics) => Math.max(2, Math.round(gm.n_replicates || 2));

/** Per-run values consistent with a summary interval. Percent for rates. */
export function runs(iv: Interval, seed: number, pct = false, n = 100): number[] {
  const k = pct ? 100 : 1;
  // an interval of zero width (every run identical) would make every test divide by zero
  const s = Math.max(((iv.ci_high - iv.ci_low) / 3.92) * k, Math.abs(iv.mean * k) * 1e-3, 1e-3);
  const r = rng(seed);
  const v = Array.from({ length: n }, () => normalish(r, iv.mean * k, s));
  // shift the draws so their average is exactly the summary's mean (with few runs, chance would move it)
  const off = iv.mean * k - v.reduce((a, x) => a + x, 0) / n;
  return v.map((x) => x + off);
}

/** Neighborhoods with a failure rate and enough residents, best served first. */
export function hoodRates(gm: GroupMetrics) {
  const all = gm.groups
    .filter((g) => g.dimension === 'neighborhood')
    .map((g) => ({ slug: g.value, name: label(g.value), n: g.n_personas_mean, iv: metricOf(g.metrics, 'failure_rate') }))
    .filter((h): h is { slug: string; name: string; n: number; iv: Interval } => !!h.iv);
  const big = all.filter((h) => h.n >= MIN_RESIDENTS);
  return (big.length >= 2 ? big : all).sort((a, b) => a.iv.mean - b.iv.mean);
}

export interface Test {
  key: string; hyp: string; title: string; question: string; unit: string;
  a: { label: string; runs: number[] }; b: { label: string; runs: number[] };
  meaningful: number; // smallest gap we'd call meaningful in real life, in `unit`
  /** +1 if the hypothesis expects a above b; 0 if it only asks whether they differ. */
  expect: 1 | 0;
}

export function tests(gm: GroupMetrics): Test[] {
  const n = nRuns(gm);
  const out: Test[] = [];
  const pair = (dim: Dimension, a: string, b: string, m: MetricKey) => {
    const x = metric(gm, dim, a, m), y = metric(gm, dim, b, m);
    return x && y ? [x, y] : null;
  };
  const f = pair('group', 'shift_worker', 'undergraduate', 'failure_rate');
  if (f) out.push({ key: 'h2', hyp: 'H2', title: 'Shift workers vs undergraduates', question: 'Do shift workers get stranded more often than undergraduates?', unit: '%',
    a: { label: GROUP_LABEL.shift_worker, runs: runs(f[0], 1, true, n) }, b: { label: GROUP_LABEL.undergraduate, runs: runs(f[1], 2, true, n) }, meaningful: 2, expect: 1 });
  const t = pair('group', 'resident_worker', 'undergraduate', 'total_minutes');
  if (t) out.push({ key: 'h1', hyp: 'H1', title: 'Resident workers vs undergraduates', question: 'Do resident workers spend longer getting where they need to go?', unit: 'min',
    a: { label: GROUP_LABEL.resident_worker, runs: runs(t[0], 3, false, n) }, b: { label: GROUP_LABEL.undergraduate, runs: runs(t[1], 4, false, n) }, meaningful: 5, expect: 1 });
  // two neighborhoods with the closest failure rates: an example of "no detectable difference"
  const hoods = hoodRates(gm);
  if (hoods.length >= 2) {
    let p = [hoods[0], hoods[1]], gap = Infinity;
    for (let i = 0; i < hoods.length - 1; i++) {
      const d = Math.abs(hoods[i].iv.mean - hoods[i + 1].iv.mean);
      if (d < gap) { gap = d; p = [hoods[i], hoods[i + 1]]; }
    }
    out.push({ key: 'hood', hyp: 'H4', title: `${p[0].name} vs ${p[1].name}`, question: 'Are these two neighborhoods served differently?', unit: '%',
      a: { label: p[0].name, runs: runs(p[0].iv, 5, true, n) }, b: { label: p[1].name, runs: runs(p[1].iv, 6, true, n) }, meaningful: 2, expect: 0 });
  }
  return out;
}

export type Status = 'Supported' | 'Not supported' | 'Mixed' | 'Pending';
export interface Verdict { id: string; claim: string; status: Status; evidence: string }

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const min = (v: number) => `${v.toFixed(0)} min`;
const sig = (a: number[], b: number[]) => pairedT(a, b).p < 0.05;

export function verdicts(aa: GroupMetrics, mad: GroupMetrics | undefined, comp: Comparison | null | undefined): Verdict[] {
  const n = nRuns(aa);
  const g = (v: string, m: MetricKey) => metric(aa, 'group', v, m);
  const R = (iv: Interval, seed: number, p = false) => runs(iv, seed, p, n);
  const groups = Object.keys(GROUP_LABEL).filter((v) => g(v, 'failure_rate'));
  const out: Verdict[] = [];
  const pending = (id: string, claim: string, evidence: string) => out.push({ id, claim, status: 'Pending', evidence });

  // H1
  {
    const claim = 'Undergraduates have shorter trips and fewer failures than resident workers.';
    const rt = g('resident_worker', 'total_minutes'), ut = g('undergraduate', 'total_minutes');
    const rf = g('resident_worker', 'failure_rate'), uf = g('undergraduate', 'failure_rate');
    if (rt && ut && rf && uf) {
      const tt = sig(R(rt, 11), R(ut, 12)) && rt.mean > ut.mean;
      const ff = sig(R(rf, 13, true), R(uf, 14, true)) && rf.mean > uf.mean;
      out.push({ id: 'H1', claim, status: tt && ff ? 'Supported' : tt || ff ? 'Mixed' : 'Not supported',
        evidence: `Travel time ${min(ut.mean)} for undergraduates vs ${min(rt.mean)} for resident workers; failures ${pct(uf.mean)} vs ${pct(rf.mean)}. Distance is not yet controlled for.` });
    } else pending('H1', claim, 'Needs travel time and failure rate for both groups.');
  }
  // H2
  {
    const claim = 'Shift workers have the highest failure rate, driven by evening and night service.';
    if (groups.length >= 2 && groups.includes('shift_worker')) {
      const sorted = [...groups].sort((x, y) => g(y, 'failure_rate')!.mean - g(x, 'failure_rate')!.mean);
      const top = sorted[0] === 'shift_worker';
      const clear = top && sig(R(g(sorted[0], 'failure_rate')!, 21, true), R(g(sorted[1], 'failure_rate')!, 22, true));
      const rank = sorted.indexOf('shift_worker') + 1;
      out.push({ id: 'H2', claim, status: clear ? 'Supported' : top ? 'Mixed' : 'Not supported',
        evidence: `Highest failure rate: ${GROUP_LABEL[sorted[0]].toLowerCase()} at ${pct(g(sorted[0], 'failure_rate')!.mean)}, next ${GROUP_LABEL[sorted[1]].toLowerCase()} at ${pct(g(sorted[1], 'failure_rate')!.mean)}.` +
          (top ? '' : ` Shift workers come ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][rank] ?? `number ${rank}`} of ${sorted.length}, at ${pct(g('shift_worker', 'failure_rate')!.mean)}.`) });
    } else pending('H2', claim, 'Needs failure rates for shift workers and the other groups.');
  }
  // H3
  {
    const claim = 'University staff sit closer to students than to other residents.';
    const need = ['university_staff', 'undergraduate', 'graduate', 'resident_worker', 'shift_worker', 'retired'];
    if (need.every((v) => g(v, 'total_minutes') && g(v, 'failure_rate'))) {
      const avg = (vs: string[], m: MetricKey) => vs.reduce((a, v) => a + g(v, m)!.mean, 0) / vs.length;
      const closer = (m: MetricKey) => Math.abs(g('university_staff', m)!.mean - avg(['undergraduate', 'graduate'], m)) < Math.abs(g('university_staff', m)!.mean - avg(['resident_worker', 'shift_worker', 'retired'], m));
      const k = +closer('total_minutes') + +closer('failure_rate');
      out.push({ id: 'H3', claim, status: k === 2 ? 'Supported' : k === 1 ? 'Mixed' : 'Not supported',
        evidence: `Staff travel time ${min(g('university_staff', 'total_minutes')!.mean)}: students average ${min(avg(['undergraduate', 'graduate'], 'total_minutes'))}, other residents ${min(avg(['resident_worker', 'shift_worker', 'retired'], 'total_minutes'))}.` });
    } else pending('H3', claim, 'Needs travel time and failure rate for every group.');
  }
  // H4
  {
    const claim = 'Neighborhood differences are as large as student–resident differences.';
    const hoods = hoodRates(aa);
    const rf = g('resident_worker', 'failure_rate'), uf = g('undergraduate', 'failure_rate');
    if (hoods.length >= 2 && rf && uf) {
      const best = hoods[0], worst = hoods[hoods.length - 1];
      const spread = worst.iv.mean - best.iv.mean;
      const groupGap = Math.abs(rf.mean - uf.mean); // size of the gap, whichever group is ahead
      out.push({ id: 'H4', claim, status: spread >= groupGap ? 'Supported' : spread >= groupGap * 0.6 ? 'Mixed' : 'Not supported',
        evidence: `Best to worst neighborhood: ${(spread * 100).toFixed(1)} points (${best.name} ${pct(best.iv.mean)}, ${worst.name} ${pct(worst.iv.mean)}). Resident workers vs undergraduates: ${(groupGap * 100).toFixed(1)} points.` });
    } else pending('H4', claim, 'Needs failure rates by neighborhood and by group.');
  }
  // H5
  {
    const claim = 'The comparison city shows a different gap, so Ann Arbor’s is not inevitable.';
    const rates = (b: GroupMetrics) => {
      const s = metric(b, 'group', 'shift_worker', 'failure_rate'), u = metric(b, 'group', 'undergraduate', 'failure_rate');
      return s && u ? { s: s.mean, u: u.mean } : null;
    };
    const a = rates(aa), m = mad ? rates(mad) : null;
    if (a && m) {
      if (a.u >= 0.01 && m.u >= 0.01) {
        // the planned test: compare the gap ratios (shift workers ÷ undergraduates)
        const ra = a.s / a.u, rm = m.s / m.u;
        out.push({ id: 'H5', claim, status: Math.abs(ra - rm) > 0.25 * Math.max(ra, 0.01) ? 'Supported' : 'Not supported',
          evidence: `Shift workers fail ${ra.toFixed(1)}× as often as undergraduates in Ann Arbor, ${rm.toFixed(1)}× in Madison.` });
      } else {
        // a ratio is meaningless when the undergraduate rate is near zero, so compare percentage points
        const ga = a.s - a.u, gm = m.s - m.u;
        const pts = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)} points`;
        out.push({ id: 'H5', claim, status: Math.abs(ga - gm) >= 0.02 ? 'Supported' : 'Not supported',
          evidence: `Shift workers’ failure rate minus undergraduates’: ${pts(ga)} in Ann Arbor, ${pts(gm)} in Madison.` });
      }
    } else pending('H5', claim, 'Waiting for the comparison city (Madison), which hasn’t been simulated yet.');
  }
  // H6
  {
    const claim = 'A targeted redesign helps the worst-served groups without hurting others.';
    const d = (v: string) => comp?.groups.find((x) => x.dimension === 'group' && x.value === v)?.deltas.failure_rate ?? null;
    const withD = groups.filter((v) => d(v));
    if (comp && withD.length >= 2) {
      const worst = [...withD].sort((x, y) => g(y, 'failure_rate')!.mean - g(x, 'failure_rate')!.mean).slice(0, 2);
      const helped = worst.every((v) => d(v)!.ci_high < 0);
      const hurt = withD.filter((v) => d(v)!.ci_low > 0.005);
      out.push({ id: 'H6', claim, status: helped && !hurt.length ? 'Supported' : helped ? 'Mixed' : 'Not supported',
        evidence: `${worst.map((v) => `${GROUP_LABEL[v]}: ${(d(v)!.delta * 100).toFixed(1)} pts`).join('; ')}. ${hurt.length ? `Worse for ${hurt.map((v) => GROUP_LABEL[v].toLowerCase()).join(', ')}.` : 'No group gets meaningfully worse.'}` });
    } else pending('H6', claim, 'Waiting for the redesigned network to be simulated.');
  }
  // H7
  {
    const claim = 'Students can rely on the buses to get them to class on time.';
    const ivs = ['undergraduate', 'graduate'].map((v) => ({ v, iv: onTime(aa, v) }));
    if (ivs.every((x) => x.iv)) {
      const ok = ivs.map(({ v, iv }, i) => {
        const t = oneSampleT(R(iv!, 71 + i).map((x) => x * 100), RELIABLE);
        return { v, m: t.m, ok: t.m > RELIABLE && t.pAbove < 0.05 };
      });
      const k = ok.filter((x) => x.ok).length;
      out.push({ id: 'H7', claim, status: k === 2 ? 'Supported' : k === 1 ? 'Mixed' : 'Not supported',
        evidence: `On time (≥5 min early): ${ok.map((x) => `${GROUP_LABEL[x.v].toLowerCase()} ${x.m.toFixed(1)}%`).join(', ')}, against a ${RELIABLE}% bar set in advance.` });
    } else pending('H7', claim, 'Waiting for the delay model, which works out on-time arrival; it hasn’t run yet.');
  }
  return out;
}
