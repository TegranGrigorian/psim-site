<script lang="ts">
  import { reveal } from '../lib/actions';
  import { GROUP_LABEL } from '../lib/format';
  import Redesign from '../components/Redesign.svelte';
  import RedesignMap from './RedesignMap.svelte';
  import type { Bundle, Comparison } from '../lib/types';

  let { before, after, comparison }: { before: Bundle; after: Bundle; comparison: Comparison } = $props();

  const hourName = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
  // Diagnosis, read straight from the baseline summaries.
  const diag = $derived.by(() => {
    const g = (v: string) => before.groupMetrics.groups.find((x) => x.dimension === 'group' && x.value === v)!.metrics.failure_rate.mean;
    const worstGroups = Object.keys(GROUP_LABEL).sort((a, b) => g(b) - g(a)).slice(0, 2);
    const s = before.tod.series.find((x) => x.group === worstGroups[0] && x.day_type === 'weekday')!;
    const avg = s.hours.reduce((a, h) => a + h.failure_rate, 0) / 24;
    const bad = s.hours.filter((h) => h.failure_rate > avg * 1.5).map((h) => h.hour);
    // bad hours wrap past midnight, so find the first hour that follows a good one
    const startH = bad.find((h) => !bad.includes((h + 23) % 24)) ?? bad[0];
    const endH = bad.find((h) => !bad.includes((h + 1) % 24)) ?? bad[bad.length - 1];
    const hoods = [...before.hoods.features].sort((a, b) => b.properties.metrics.failure_rate.mean - a.properties.metrics.failure_rate.mean).slice(0, 3);
    return { worstGroups, g, startH, endH, hoods };
  });
  const newRoutes = $derived(after.routes.features.filter((f) => f.properties.is_new));
</script>

<div class="steps">
  <div class="s card" use:reveal data-reveal>
    <span class="n">A</span>
    <b>Find where it breaks</b>
    <ul>
      <li>Worst-served groups: {diag.worstGroups.map((v) => `${GROUP_LABEL[v].toLowerCase()} (${(diag.g(v) * 100).toFixed(0)}% of trips fail)`).join(' and ')}.</li>
      <li>Failures pile up between <b>{hourName(diag.startH)}</b> and <b>{hourName((diag.endH + 1) % 24)}</b>, when service thins out.</li>
      <li>Hardest-hit areas: {diag.hoods.map((f) => f.properties.name).join(', ')}.</li>
    </ul>
  </div>
  <div class="s card" use:reveal={{ delay: 100 }} data-reveal>
    <span class="n">B</span>
    <b>Change the timetable</b>
    <ul>
      {#each newRoutes as r}<li><b>{r.properties.route_short_name.replace(' (new)', '')}</b>: about {r.properties.trips_per_weekday} late-night trips on an existing corridor.</li>{/each}
      <li>Nothing else changes, so any difference comes from these routes alone.</li>
    </ul>
  </div>
  <div class="s card" use:reveal={{ delay: 200 }} data-reveal>
    <span class="n">C</span>
    <b>Rerun and compare</b>
    <ul>
      <li>The same 100 towns, the same people and the same trips, on the edited timetable.</li>
      <li>A change counts only if its 95% interval stays clear of zero.</li>
    </ul>
  </div>
</div>

<h3 use:reveal data-reveal>What the new map would look like</h3>
<RedesignMap {before} {after} />

<h3 use:reveal data-reveal>Who it helps, and by how much</h3>
<Redesign {comparison} />
<p class="fine">Placeholder data: the redesign, its routes and its effects are invented to show the method. The real redesign will be drawn from the real failures.</p>

<style>
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .s { padding: 18px; }
  .n { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--blue); color: var(--maize); font-weight: 700; font-size: 13px; margin-bottom: 8px; }
  .s b { display: block; font-family: var(--serif); font-size: 20px; margin-bottom: 6px; }
  .s li b { display: inline; font-family: var(--sans); font-size: inherit; margin: 0; }
  ul { margin: 0; padding-left: 1.1em; display: grid; gap: 6px; color: #36424f; font-size: 14.5px; }
  h3 { font-size: clamp(22px, 2.8vw, 28px); margin: 36px 0 14px; }
  .fine { font-size: 13px; color: var(--muted); margin-top: 12px; }
  @media (max-width: 860px) { .steps { grid-template-columns: 1fr; } }
</style>
