import type { MetricKey } from './types';

export interface MetricMeta {
  key: MetricKey;
  label: string;
  short: string;
  unit: string;
  digits: number;
  pct?: boolean;
}

export const METRICS: MetricMeta[] = [
  { key: 'failure_rate', label: 'Trips that cannot be completed', short: 'Failure rate', unit: '%', digits: 1, pct: true },
  { key: 'total_minutes', label: 'Door-to-door travel time', short: 'Travel time', unit: 'min', digits: 0 },
  { key: 'wait_minutes', label: 'Time spent waiting', short: 'Wait time', unit: 'min', digits: 1 },
  { key: 'transfers', label: 'Transfers per trip', short: 'Transfers', unit: '', digits: 2 },
  { key: 'in_vehicle_minutes', label: 'Time on the bus', short: 'In-vehicle', unit: 'min', digits: 0 },
  { key: 'walk_minutes', label: 'Time walking', short: 'Walking', unit: 'min', digits: 0 },
];

export const metricMeta = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

export function fmt(k: MetricKey, v: number, withUnit = true): string {
  const m = metricMeta(k);
  const n = m.pct ? v * 100 : v;
  const s = n.toFixed(m.digits);
  return withUnit && m.unit ? (m.pct ? `${s}%` : `${s} ${m.unit}`) : s;
}

export const GROUP_LABEL: Record<string, string> = {
  undergraduate: 'Undergraduates',
  graduate: 'Graduate students',
  university_staff: 'University staff',
  resident_worker: 'Resident workers',
  shift_worker: 'Shift workers',
  retired: 'Retired residents',
};

export const GROUP_COLOR: Record<string, string> = {
  undergraduate: '#00274C',
  graduate: '#2F65A7',
  university_staff: '#00A0A0',
  resident_worker: '#E0A800',
  shift_worker: '#D86018',
  retired: '#9A3324',
};

const MISC: Record<string, string> = {
  own: 'Own',
  rent: 'Rent',
  dorm: 'Dorm',
  other_group: 'Other group housing',
  standard_day: 'Standard day',
  early: 'Early shift',
  evening: 'Evening shift',
  night: 'Night shift',
  rotating: 'Rotating shift',
  student: 'Student schedule',
  none: 'No fixed schedule',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_49': '35–49',
  '50_64': '50–64',
  '65_plus': '65+',
  low: 'Lower income',
  mid: 'Middle income',
  high: 'Higher income',
};

export function label(value: string): string {
  return GROUP_LABEL[value] ?? MISC[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DIMENSIONS = [
  { key: 'group', label: 'Group' },
  { key: 'tenure', label: 'Tenure' },
  { key: 'shift_pattern', label: 'Schedule' },
  { key: 'age_band', label: 'Age' },
  { key: 'income_band', label: 'Income' },
] as const;

/** Linear blend between hex colours. */
export function ramp(stops: string[], t: number): string {
  const c = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(c));
  const f = c - i;
  const a = parseInt(stops[i].slice(1), 16);
  const b = parseInt(stops[i + 1].slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Cream to navy: higher is worse for every metric shown. */
export const HEAT = ['#F6F1DE', '#F3D77A', '#E39B2D', '#8F4A55', '#00274C'];
