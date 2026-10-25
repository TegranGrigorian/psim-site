import type { Dimension, MetricKey } from './types';

export const app = $state({
  city: 'ann_arbor',
  scenario: 'baseline',
  metric: 'failure_rate' as MetricKey,
  dim: 'group' as Dimension,
  dayType: 'weekday' as 'weekday' | 'weekend',
});
