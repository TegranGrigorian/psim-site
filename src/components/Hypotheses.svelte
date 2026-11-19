<script lang="ts">
  import HypothesisCards from './HypothesisCards.svelte';
  import type { Report } from '../lib/types';

  // Stated up front (PLAN.md §6). The verdicts come from the project's report once it exists.
  let { report }: { report?: Report | null } = $props();
  const H: [string, string][] = [
    ['H1', 'Undergraduates have lower travel time and failure rate than resident workers, for equivalent distances.'],
    ['H2', 'Shift workers have the highest failure rate, driven by evening and night service.'],
    ['H3', 'University staff sit closer to students than to other residents on the main metrics.'],
    ['H4', 'Differences between neighborhoods are as large as differences between student and resident groups.'],
    ['H5', 'The comparison city shows a different gap, so Ann Arbor’s arrangement is not inevitable.'],
    ['H6', 'A targeted redesign reduces failure among the worst-served groups without hurting others.'],
  ];
</script>

<HypothesisCards claims={H} {report} />
