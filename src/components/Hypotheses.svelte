<script lang="ts">
  import { reveal } from '../lib/actions';

  // Stated up front (PLAN.md §6). Statuses stay "not yet tested" until real results exist.
  const H = [
    ['H1', 'Undergraduates have lower travel time and failure rate than resident workers, for equivalent distances.'],
    ['H2', 'Shift workers have the highest failure rate, driven by evening and night service.'],
    ['H3', 'University staff sit closer to students than to other residents on the main metrics.'],
    ['H4', 'Differences between neighborhoods are as large as differences between student and resident groups.'],
    ['H5', 'The comparison city shows a different gap, so Ann Arbor’s arrangement is not inevitable.'],
    ['H6', 'A targeted redesign reduces failure among the worst-served groups without hurting others.'],
  ];
</script>

<ul>
  {#each H as [id, text], i}
    <li class="card" use:reveal={{ delay: (i % 3) * 80 }} data-reveal>
      <span class="id">{id}</span>
      <p>{text}</p>
      <span class="status">Not yet tested</span>
    </li>
  {/each}
</ul>

<style>
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  li { padding: 22px; display: flex; flex-direction: column; gap: 10px; transition: transform 0.3s var(--ease), box-shadow 0.3s; }
  li:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0, 39, 76, 0.1); }
  .id { font-family: var(--serif); font-size: 30px; font-weight: 600; color: var(--blue); }
  p { margin: 0; flex: 1; color: #36424f; font-size: 15px; }
  .status { align-self: flex-start; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--maize-soft); color: #6b5400; }
  @media (max-width: 900px) { ul { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { ul { grid-template-columns: 1fr; } }
</style>
