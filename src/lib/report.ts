// Plain-language reading of data/report/hypotheses.json (written by `psim-engine report`).
// The verdicts are the report's; this file only turns its numbers into one readable line per city.
import { GROUP_LABEL, label } from './format';
import type { ReportEntry, ReportTest } from './types';

export interface Diff { v: number; lo: number; hi: number }

/** "+16.3 min [+14.3, +18.1]" → { v: 16.3, lo: 14.3, hi: 18.1 }; null if it doesn't parse. */
export function parseDiff(s: string): Diff | null {
  const m = /^\s*([+\-−]?\d+(?:\.\d+)?)[^\[]*\[\s*([+\-−]?\d+(?:\.\d+)?)\s*,\s*([+\-−]?\d+(?:\.\d+)?)\s*\]/.exec(s);
  if (!m) return null;
  const n = (x: string) => +x.replace('−', '-');
  const d = { v: n(m[1]), lo: n(m[2]), hi: n(m[3]) };
  return [d.v, d.lo, d.hi].every(Number.isFinite) ? d : null;
}

export type Tone = 'good' | 'partgood' | 'mixed' | 'partbad' | 'bad' | 'unclear' | 'none';
export function tone(verdict: string): Tone {
  const v = verdict.toLowerCase();
  if (v.startsWith('contradicted')) return 'bad';
  if (v === 'partly contradicted') return 'partbad';
  if (v === 'partly supported') return 'partgood';
  if (v === 'supported') return 'good';
  if (v === 'mixed') return 'mixed';
  if (v === 'no data') return 'none';
  return 'unclear';
}
/** "contradicted (someone is worse off)" → "Contradicted: someone is worse off" */
export const verdictLabel = (verdict: string) => {
  const s = verdict.replace(/\s*\((.+)\)\s*$/, ': $1');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "Ann Arbor, MI vs Madison, WI" → "Both cities"; "Madison, WI" → "Madison". */
export const cityShort = (city: string) => (/\bvs\b/.test(city) ? 'Both cities' : city.split(',')[0]);

const f1 = (v: number) => Math.abs(v).toFixed(1);
const tag = (t: ReportTest) => {
  const v = t.verdict.toLowerCase();
  return v === 'contradicted' ? ' (the opposite of the prediction)' : v === 'inconclusive' ? ' (too close to call)' : '';
};
const byMetric = (e: ReportEntry, m: string) => e.tests.find((t) => t.metric === m && parseDiff(t.difference));
const d = (t: ReportTest) => parseDiff(t.difference)!;
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** "shift worker - retired residents" → "retired residents" */
const other = (t: ReportTest) => t.test.split(/\s+-\s+/)[1]?.replace(/\s*\(.*\)$/, '').trim() ?? t.test;

const METRIC: Record<string, string> = {
  total_minutes: 'door-to-door time', failure_rate: 'failed trips', on_time_rate: 'on-time arrival',
  minutes_per_km: 'minutes per kilometre', wait_minutes: 'waiting time', transfers: 'transfers',
};

function h1(e: ReportEntry): string | null {
  const tm = byMetric(e, 'total_minutes'), fr = byMetric(e, 'failure_rate'), pk = byMetric(e, 'minutes_per_km');
  if (!tm || !fr) return null;
  const parts = [`Resident workers’ trips take ${f1(d(tm).v)} min ${d(tm).v >= 0 ? 'longer' : 'less'} than undergraduates’${tag(tm)}`];
  if (pk) parts.push(Math.abs(d(pk).v) < 0.05 ? `per kilometre travelled they are equally fast${tag(pk)}` : `per kilometre travelled they are ${f1(d(pk).v)} min ${d(pk).v > 0 ? 'slower' : 'faster'}${tag(pk)}`);
  parts.push(`their trips fail ${f1(d(fr).v)} points ${d(fr).v >= 0 ? 'more' : 'less'} often${tag(fr)}`);
  return parts.join('; ') + '.';
}

function h2(e: ReportEntry): string | null {
  const ts = e.tests.filter((t) => t.metric === 'failure_rate' && parseDiff(t.difference));
  if (!ts.length) return null;
  const vs = ts.map((t) => d(t).v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const unclear = ts.filter((t) => t.verdict === 'inconclusive').map(other);
  const against = ts.filter((t) => t.verdict.startsWith('contradicted')).map(other);
  if (lo < 0) return `Shift workers’ trips do not fail most often: ${listJoin(ts.filter((t) => d(t).v < 0).map(other))} fail more.`;
  let s = `Shift workers’ trips fail ${lo === hi ? f1(lo) : `${f1(lo)} to ${f1(hi)}`} points more often than any other group’s`;
  if (against.length) s += `; the gap over ${listJoin(against)} runs the other way`;
  if (unclear.length) s += `; the gap over ${listJoin(unclear)} is too close to call`;
  return s + '.';
}

function h3(e: ReportEntry): string | null {
  const tm = byMetric(e, 'total_minutes');
  if (!tm) return null;
  const v = d(tm).v;
  const why = tm.verdict === 'contradicted' ? ', the opposite of the prediction' : tm.verdict === 'inconclusive' ? ', but that is too close to call' : '';
  let s = `Staff travel times sit closer to ${v < 0 ? 'resident workers’' : 'undergraduates’'} than to ${v < 0 ? 'undergraduates’' : 'resident workers’'}, by ${f1(v)} min${why}`;
  const rest = e.tests.filter((t) => t !== tm);
  if (rest.length && rest.every((t) => t.verdict === 'inconclusive')) s += `; ${listJoin(rest.map((t) => METRIC[t.metric] ?? t.metric))} don’t clearly lean either way`;
  return s + '.';
}

function h4(e: ReportEntry): string | null {
  const t = e.tests.find((x) => parseDiff(x.difference));
  if (!t) return null;
  const v = d(t).v, what = METRIC[t.metric] ?? t.metric;
  return v >= 0
    ? `Neighborhoods differ more in ${what} than groups do: the typical spread is ${f1(v)} ${t.metric === 'failure_rate' ? 'points' : 'min'} wider${tag(t)}.`
    : `Groups differ more in ${what} than neighborhoods do: the typical spread is ${f1(v)} ${t.metric === 'failure_rate' ? 'points' : 'min'} wider${tag(t)}.`;
}

function h5(e: ReportEntry): string | null {
  const ts = e.tests.filter((t) => parseDiff(t.difference));
  if (!ts.length) return null;
  const clear = ts.filter((t) => t.verdict !== 'inconclusive');
  const unclear = ts.filter((t) => t.verdict === 'inconclusive');
  const IN: Record<string, string> = { minutes_per_km: 'per kilometre travelled' };
  const parts = clear.map((t) => `${IN[t.metric] ?? `in ${METRIC[t.metric] ?? t.metric}`}, the resident–student gap differs between the two cities by ${f1(d(t).v)}%`);
  if (unclear.length) parts.push(`for ${listJoin(unclear.map((t) => METRIC[t.metric] ?? t.metric))} the difference is too uncertain to call`);
  const s = parts.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

function h6(e: ReportEntry): string | null {
  const target = e.tests.find((t) => /targeted area/.test(t.test) && parseDiff(t.difference));
  const worst = e.tests.find((t) => /worst-served/.test(t.test) && parseDiff(t.difference));
  const guard = e.tests.filter((t) => /must not get worse/.test(t.test));
  if (!target && !worst) return null;
  const parts: string[] = [];
  const change = (t: ReportTest) => (d(t).v <= 0 ? `fell by ${f1(d(t).v)} points` : `rose by ${f1(d(t).v)} points`);
  if (target) parts.push(`In the targeted area (${label(target.test.split(':')[0])}) failed trips ${change(target)}${tag(target)}`);
  if (worst) {
    const who = worst.test.split(':')[0];
    parts.push(`for ${(GROUP_LABEL[who] ?? who).toLowerCase()}, the worst-served group, they ${change(worst)}${tag(worst)}`);
  }
  if (guard.length) {
    const hurt = [...new Set(guard.filter((t) => t.verdict !== 'not hurt').map((t) => t.test.split(':')[0]))];
    parts.push(hurt.length ? `worse off: ${listJoin(hurt.map((x) => x.toLowerCase()))}` : 'no group got worse');
  }
  const s = parts.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

const SUMMARY: Record<string, (e: ReportEntry) => string | null> = { H1: h1, H2: h2, H3: h3, H4: h4, H5: h5, H6: h6 };

/** One plain line with the key numbers behind a verdict. Falls back to listing the tests. */
export function summarize(e: ReportEntry): string {
  if (!e.tests.length) return 'No data for this yet.';
  try {
    const s = SUMMARY[e.id]?.(e);
    if (s) return s;
  } catch { /* fall through to the generic line */ }
  return e.tests.map((t) => `${METRIC[t.metric] ?? t.metric}: ${t.difference} (${t.verdict})`).join('; ') + '.';
}

/** The verdict rule, in plain words. */
export const PLAIN_RULE =
  'Each hypothesis is checked with one or more comparisons, repeated in every simulation run. A comparison is supported when the middle 95% of the runs all point the way we predicted, contradicted when they all point the other way, and inconclusive when that range includes “no difference.” Partly and mixed mean a hypothesis’s comparisons came out differently.';
