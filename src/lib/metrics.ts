// Null-safe access to summary metrics (SCHEMA.md §5.1 allows missing and null metrics).
import type { Dimension, ExtraKey, GroupEntry, GroupMetrics, Interval, MetricKey, Metrics } from './types';

/** A metric interval, or null when the file leaves it out or sets it to null. */
export const metricOf = (m: Metrics | undefined, k: MetricKey | ExtraKey): Interval | null => {
  const iv = m?.[k];
  return iv && Number.isFinite(iv.mean) ? iv : null;
};

export const entry = (gm: GroupMetrics, dim: Dimension, value: string): GroupEntry | undefined =>
  gm.groups.find((x) => x.dimension === dim && x.value === value);

/** Shortcut: the interval for one (dimension, value, metric), or null. */
export const groupMetric = (gm: GroupMetrics, dim: Dimension, value: string, k: MetricKey | ExtraKey) => metricOf(entry(gm, dim, value)?.metrics, k);
