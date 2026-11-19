// The three headline numbers on the homepage, worked out from group_metrics.json.
// Every number is finite: a ratio is only used when the smaller rate is big enough to divide by,
// otherwise the gap is given in percentage points.
import { groupMetric, metricOf } from './metrics';
import { GROUP_LABEL, label } from './format';
import type { GroupMetrics } from './types';

export interface HeroStat { to: number; digits: number; suffix: string; text: string }

/** Below this failure rate (1%), "N× as often" swings wildly with tiny changes, so use points instead. */
const RATIO_FLOOR = 0.01;
/** Neighborhoods with fewer simulated residents than this are too noisy to call best or worst. */
const MIN_RESIDENTS = 10;

export const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Compare two failure rates as "N× as often" or as a percentage-point gap, larger first. */
export function compareRates(a: { name: string; v: number }, b: { name: string; v: number }, how: 'groups' | 'places'): HeroStat {
  const [hi, lo] = a.v >= b.v ? [a, b] : [b, a];
  // from the rounded percentages shown in the sentence, so the arithmetic reads right (5.3% − 0.5% = 4.8)
  const r1 = (v: number) => Math.round(v * 1000) / 10;
  const pts = Math.round((r1(hi.v) - r1(lo.v)) * 10) / 10;
  if (lo.v >= RATIO_FLOOR && hi.v / lo.v >= 1.05) {
    const r = hi.v / lo.v;
    return {
      to: r, digits: 1, suffix: '×',
      text: how === 'groups'
        ? `${cap(hi.name)} fail to complete a trip ${r.toFixed(1)}× as often as ${lo.name} (${pct(hi.v)} vs ${pct(lo.v)} of trips).`
        : `Trips fail ${r.toFixed(1)}× as often in the worst served neighborhood (${hi.name}, ${pct(hi.v)}) as in the best served (${lo.name}, ${pct(lo.v)}).`,
    };
  }
  if (pts < 0.05) {
    return {
      to: 0, digits: 1, suffix: ' pts',
      text: how === 'groups'
        ? `${cap(a.name)} and ${b.name} fail to complete about the same share of trips (${pct(a.v)}).`
        : `Trips fail about equally often in every neighborhood (around ${pct(a.v)}).`,
    };
  }
  return {
    to: pts, digits: 1, suffix: ' pts',
    text: how === 'groups'
      ? `${cap(hi.name)} fail to complete ${pct(hi.v)} of trips, ${lo.name} ${pct(lo.v)}: a gap of ${pts.toFixed(1)} percentage points.`
      : `Gap in failed trips between the worst served neighborhood (${hi.name}, ${pct(hi.v)}) and the best (${lo.name}, ${pct(lo.v)}), in percentage points.`,
  };
}

export function heroStats(gm: GroupMetrics): HeroStat[] {
  const out: HeroStat[] = [];
  const fr = (g: string) => groupMetric(gm, 'group', g, 'failure_rate')?.mean;
  const tt = (g: string) => groupMetric(gm, 'group', g, 'total_minutes')?.mean;
  const name = (g: string) => GROUP_LABEL[g].toLowerCase();

  // 1. failure: shift workers vs undergraduates (hypothesis H2)
  const s = fr('shift_worker'), u = fr('undergraduate');
  if (s !== undefined && u !== undefined) out.push(compareRates({ name: name('shift_worker'), v: s }, { name: name('undergraduate'), v: u }, 'groups'));

  // 2. door-to-door time: resident workers vs undergraduates (hypothesis H1)
  const r = tt('resident_worker'), ug = tt('undergraduate');
  if (r !== undefined && ug !== undefined) {
    const d = r - ug;
    const vs = `(${r.toFixed(0)} vs ${ug.toFixed(0)} min)`;
    out.push(Math.abs(d) < 0.5
      ? { to: 0, digits: 0, suffix: ' min', text: `Resident workers and undergraduates spend about the same time door to door ${vs}.` }
      : { to: Math.abs(d), digits: 0, suffix: ' min', text: `${d > 0 ? 'Extra' : 'Less'} door-to-door time per trip for a resident worker compared with an undergraduate ${vs}.` });
  }

  // 3. spread between neighborhoods (hypothesis H4)
  const all = gm.groups
    .filter((g) => g.dimension === 'neighborhood')
    .map((g) => ({ name: label(g.value), v: metricOf(g.metrics, 'failure_rate')?.mean, n: g.n_personas_mean }))
    .filter((h): h is { name: string; v: number; n: number } => h.v !== undefined);
  const big = all.filter((h) => h.n >= MIN_RESIDENTS);
  const hoods = (big.length >= 2 ? big : all).sort((a, b) => a.v - b.v);
  if (hoods.length >= 2) out.push(compareRates(hoods[hoods.length - 1], hoods[0], 'places'));

  return out.filter((x) => Number.isFinite(x.to));
}
