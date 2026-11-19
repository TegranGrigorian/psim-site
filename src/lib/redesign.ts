// Plain sentences about a redesign scenario: what changed (from data/<city>/<scenario>.json via
// sync-data.mjs), how its target area fared and whether any group got worse (from comparison.json).
import { label } from './format';
import type { Comparison, ScenarioSpec } from './types';

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const hh = h % 24, ap = hh < 12 ? 'am' : 'pm', h12 = hh % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pts = (v: number) => (Math.abs(v * 100) < 0.05 ? '0' : (Math.abs(v) * 100).toFixed(1));

/** Sentences describing the timetable edits, e.g. "Route 65 (U-M – Plymouth – Greenhills) now runs until 11:30 pm instead of 9:10 pm …". */
export function changes(spec: ScenarioSpec | null | undefined): string[] {
  if (!spec?.feeds) return [];
  const desc = spec.description ?? '';
  const out: string[] = [];
  const byRoute = new Map<string, { op: string; until?: string; from?: string; to?: string; factor?: number }[]>();
  for (const op of Object.values(spec.feeds).flat()) {
    const r = String(op.route);
    byRoute.set(r, [...(byRoute.get(r) ?? []), op]);
  }
  for (const [route, ops] of byRoute) {
    const long = new RegExp(`route\\s+${route}\\s+\\(([^)]+)\\)`, 'i').exec(desc)?.[1]?.replace(/\s+-\s+/g, ' – ');
    const was = new RegExp(`route\\s+${route}\\b[^.]*?ends at (\\d{1,2}:\\d{2})`, 'i').exec(desc)?.[1];
    const parts: string[] = [];
    for (const op of ops) {
      if (op.op === 'extend_span' && op.until) parts.push(`now runs until ${clock(op.until)}${was ? ` instead of stopping at ${clock(was)}` : ''}`);
      else if (op.op === 'frequency' && op.from && op.to) {
        const f = op.factor ?? 2;
        parts.push(`${f === 2 ? 'runs twice as often' : `runs ${f}× as often`} between ${clock(op.from)} and ${clock(op.to)}`);
      } else parts.push(`is changed (${op.op})`);
    }
    let s = `Route ${route}${long ? ` (${long})` : ''} ${parts.join(', and ')}.`;
    const t = spec.routes?.find((x) => x.route === route);
    if (t?.trips_before != null && t.trips_after != null && t.trips_after !== t.trips_before) {
      const d = t.trips_after - t.trips_before;
      s += ` That is ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} bus trips each weekday (${t.trips_before} → ${t.trips_after}).`;
    }
    out.push(s);
  }
  out.push('Nothing else in the timetable changed, so any difference comes from this alone.');
  return out;
}

export interface Target { name: string; before: number; after: number; sentence: string; spread: string }

/** How the area the redesign was aimed at fared, or null if the comparison doesn't cover it. */
export function target(spec: ScenarioSpec | null | undefined, cmp: Comparison): Target | null {
  const slug = spec?.target_tract;
  const d = slug ? cmp.groups.find((g) => g.dimension === 'neighborhood' && g.value === slug)?.deltas.failure_rate : null;
  if (!slug || !d) return null;
  const name = label(slug);
  const n = cmp.n_paired_replicates;
  const runs = n ? `the ${n} paired runs` : 'the paired runs';
  const sentence = d.delta < 0
    ? `In the area it was aimed at, ${name}, trips that fail dropped from ${pct(d.before)} to ${pct(d.after)}.`
    : `In the area it was aimed at, ${name}, trips that fail went from ${pct(d.before)} to ${pct(d.after)}.`;
  const spread = d.ci_high < 0
    ? `The drop holds across the middle 95% of ${runs}.`
    : d.ci_low > 0
      ? `Across the middle 95% of ${runs} it got worse by ${pts(d.ci_low)} to ${pts(d.ci_high)} points.`
      : `Across the middle 95% of ${runs} the change ranges from ${d.ci_low < 0 ? `${pts(d.ci_low)} points better` : 'no change'} to ${d.ci_high > 0 ? `${pts(d.ci_high)} points worse` : 'no change'}, so it is promising but not yet clear-cut.`;
  return { name, before: d.before, after: d.after, sentence, spread };
}

/** Whether any group got worse on failed trips or travel time. */
export function nobodyWorse(cmp: Comparison): { ok: boolean; sentence: string } {
  const groups = cmp.groups.filter((g) => g.dimension === 'group');
  const keys = ['failure_rate', 'total_minutes'] as const;
  const clearly = groups.filter((g) => keys.some((k) => (g.deltas[k]?.ci_low ?? 0) > 0)).map((g) => label(g.value).toLowerCase());
  if (clearly.length) return { ok: false, sentence: `Worse off: ${clearly.join(', ')}.` };
  const allDown = groups.every((g) => keys.every((k) => (g.deltas[k]?.delta ?? 0) <= 0));
  return {
    ok: true,
    sentence: allDown
      ? 'No group got worse: on average every group’s failed trips and travel times stayed the same or went down.'
      : 'No group got clearly worse: any increase is within the run-to-run noise.',
  };
}
