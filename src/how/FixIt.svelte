<script lang="ts">
  import { reveal } from '../lib/actions';
  import { GROUP_LABEL } from '../lib/format';
  import { groupMetric } from '../lib/metrics';
  import Redesign from '../components/Redesign.svelte';
  import Pending from '../components/Pending.svelte';
  import type RedesignMapComponent from './RedesignMap.svelte';
  import { hoodRates } from './evidence';
  import { changes } from '../lib/redesign';
  import type { Bundle, Comparison, Core, Geo, ScenarioSpec } from '../lib/types';

  // `before` is the baseline summary, always available. The redesign parts appear only once that
  // scenario has been simulated; until then they say so.
  let { before, beforeGeo, after, comparison, spec, RedesignMap }: {
    before: Core; beforeGeo?: Geo; after?: Bundle; comparison?: Comparison | null; spec?: ScenarioSpec | null; RedesignMap?: typeof RedesignMapComponent;
  } = $props();

  const hourName = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
  const fail = (v: string) => groupMetric(before.groupMetrics, 'group', v, 'failure_rate')?.mean;

  // Diagnosis, read straight from the baseline summaries.
  const diag = $derived.by(() => {
    const worstGroups = Object.keys(GROUP_LABEL).filter((v) => fail(v) !== undefined).sort((a, b) => fail(b)! - fail(a)!).slice(0, 2);
    // Hours when the worst-served group's failures pile up. Hours with no trips are "no data" and never count.
    const s = worstGroups[0] ? before.tod.series.find((x) => x.group === worstGroups[0] && x.day_type === 'weekday') : undefined;
    const hours = Array.from({ length: 24 }, (_, h) => s?.hours.find((x) => x.hour === h)).map((x) => (x && (x.n_trips ?? 1) > 0 ? x : null));
    const known = hours.filter((x) => x !== null);
    const avg = known.length ? known.reduce((a, x) => a + x.failure_rate, 0) / known.length : 0;
    const bad = hours.map((x) => !!x && avg > 0 && x.failure_rate > avg * 1.5);
    // runs of consecutive bad hours (wrapping past midnight); keep the one with the most failed trips
    let window: { start: number; end: number } | null = null, best = -1;
    for (let h = 0; h < 24; h++) {
      if (!bad[h] || bad[(h + 23) % 24] && bad.some((b) => !b)) continue;
      let end = h, weight = 0;
      for (let k = 0; k < 24 && bad[(h + k) % 24]; k++) { end = (h + k) % 24; const x = hours[end]!; weight += x.failure_rate * (x.n_trips ?? 1); }
      if (weight > best) { best = weight; window = { start: h, end }; }
    }
    return { worstGroups, window, hoods: hoodRates(before.groupMetrics).slice(-3).reverse() };
  });
  const ready = $derived(!!(after && comparison && beforeGeo));
  const newRoutes = $derived(after?.routes.features.filter((f) => f.properties.is_new) ?? []);
  const what = $derived(changes(spec));
  // routes the redesign adds or edits, highlighted on the map
  const changed = $derived([...new Set([...newRoutes.map((f) => f.properties.route_id), ...(spec?.routes ?? []).map((r) => r.route)])]);
</script>

<div class="steps">
  <div class="s card" use:reveal data-reveal>
    <span class="n">A</span>
    <b>Find where it breaks</b>
    <ul>
      {#if diag.worstGroups.length}
        <li>Worst-served groups: {diag.worstGroups.map((v) => `${GROUP_LABEL[v].toLowerCase()} (${(fail(v)! * 100).toFixed(1)}% of trips fail)`).join(' and ')}.</li>
      {/if}
      {#if diag.window}
        <li>For {GROUP_LABEL[diag.worstGroups[0]].toLowerCase()}, failures pile up between <b>{hourName(diag.window.start)}</b> and <b>{hourName((diag.window.end + 1) % 24)}</b> on weekdays.</li>
      {:else if diag.worstGroups.length}
        <li>For {GROUP_LABEL[diag.worstGroups[0]].toLowerCase()}, no single time of day stands out.</li>
      {/if}
      {#if diag.hoods.length}<li>Hardest-hit areas: {diag.hoods.map((h) => `${h.name} (${(h.iv.mean * 100).toFixed(1)}%)`).join(', ')}.</li>{/if}
    </ul>
  </div>
  <div class="s card" class:wait={!ready} use:reveal={{ delay: 100 }} data-reveal>
    <span class="n">B</span>
    <b>Change the timetable</b>
    <ul>
      {#if ready}
        {#if what.length}
          {#each what as line}<li>{line}</li>{/each}
        {:else}
          {#each newRoutes as r}<li><b>{r.properties.route_short_name.replace(' (new)', '')}</b>: about {r.properties.trips_per_weekday ?? '?'} trips a weekday on an existing corridor.</li>{/each}
          <li>Nothing else changes, so any difference comes from these routes alone.</li>
        {/if}
      {:else}
        <li>Add service where step A says trips fail, and change nothing else.</li>
        <li><em>Not done yet: the redesign will be drawn from these real failures.</em></li>
      {/if}
    </ul>
  </div>
  <div class="s card" class:wait={!ready} use:reveal={{ delay: 200 }} data-reveal>
    <span class="n">C</span>
    <b>Rerun and compare</b>
    <ul>
      <li>The same simulated towns, the same people and the same trips, on the edited timetable.</li>
      <li>A change counts only if its 95% interval stays clear of zero.</li>
    </ul>
  </div>
</div>

{#if ready && after && beforeGeo && comparison}
  <h3 use:reveal data-reveal>What the new map would look like</h3>
  {#if RedesignMap}<RedesignMap before={beforeGeo} {after} highlight={changed} />{:else}<div class="card mapwait">Loading the map…</div>{/if}

  <h3 use:reveal data-reveal>Who it helps, and by how much</h3>
  <Redesign {comparison} {spec} />
{:else}
  <div class="later">
    <Pending title="The before-and-after will appear here">
      A map of the new routes and a chart of who gains and who loses, once the redesigned network has been simulated.
      That hasn’t happened yet; it’s the next simulation run after the baseline.
    </Pending>
  </div>
{/if}

<style>
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .s { padding: 18px; }
  .s.wait { background: rgba(255, 255, 255, 0.6); border-style: dashed; }
  .n { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--blue); color: var(--maize); font-weight: 700; font-size: 13px; margin-bottom: 8px; }
  .s b { display: block; font-family: var(--serif); font-size: 20px; margin-bottom: 6px; }
  .s li b { display: inline; font-family: var(--sans); font-size: inherit; margin: 0; }
  ul { margin: 0; padding-left: 1.1em; display: grid; gap: 6px; color: #36424f; font-size: 14.5px; }
  h3 { font-size: clamp(22px, 2.8vw, 28px); margin: 36px 0 14px; }
  .later { margin-top: 22px; }
  .mapwait { min-height: 400px; display: grid; place-items: center; color: var(--muted); }
  @media (max-width: 860px) { .steps { grid-template-columns: 1fr; } }
</style>
