<script lang="ts">
  import { onMount } from 'svelte';
  import Nav from './components/Nav.svelte';
  import Hero from './components/Hero.svelte';
  import GapChart from './components/GapChart.svelte';
  import SiteMap from './components/SiteMap.svelte';
  import TimeOfDay from './components/TimeOfDay.svelte';
  import Redesign from './components/Redesign.svelte';
  import Elsewhere from './components/Elsewhere.svelte';
  import Hypotheses from './components/Hypotheses.svelte';
  import Footer from './components/Footer.svelte';
  import { reveal } from './lib/actions';
  import { app } from './lib/state.svelte';
  import { METRICS } from './lib/format';
  import { loadBundle, loadComparison, loadIndex } from './lib/data';
  import type { Bundle, Comparison, Index } from './lib/types';

  let index = $state<Index>();
  let bundles = $state<Record<string, Bundle>>({});
  let comparison = $state<Comparison | null>(null);
  let error = $state('');

  onMount(async () => {
    try {
      const idx = await loadIndex();
      const pairs = idx.cities.flatMap((c) => c.scenarios.map((s) => [c.slug, s] as const));
      const loaded = await Promise.all(pairs.map(([c, s]) => loadBundle(c, s)));
      bundles = Object.fromEntries(pairs.map(([c, s], i) => [`${c}/${s}`, loaded[i]]));
      comparison = await loadComparison('ann_arbor', 'redesign_v1');
      index = idx;
    } catch (e) {
      error = String(e);
    }
  });

  const city = $derived(index?.cities.find((c) => c.slug === app.city));
  const bundle = $derived(bundles[`${app.city}/${app.scenario}`] ?? bundles[`${app.city}/baseline`]);
  const base = $derived(bundles[`${app.city}/baseline`]);
  const hasRedesign = $derived(!!city?.scenarios.includes('redesign_v1'));
  const second = $derived(index?.cities.find((c) => c.slug !== 'ann_arbor'));
</script>

{#if error}
  <main class="wrap state"><h1>Data not found</h1><p>{error}</p><p class="note">Run <code>npm run fake-data</code> then <code>npm run sync-data</code>.</p></main>
{:else if !index || !city || !bundle}
  <main class="state"><span class="spin" aria-label="Loading"></span></main>
{:else}
  {#if index.fake}
    <div class="fake" role="note"><b>Preview build.</b> Every number on this page is synthetic placeholder data, not a research result.</div>
  {/if}
  <Nav cities={index.cities} />
  <div id="top"></div>
  <Hero bundle={base} cityName={city.display_name} />

  <main>
    <section class="section" id="gap">
      <div class="wrap">
        <div class="kicker" use:reveal data-reveal><b>01</b> The gap</div>
        <h2 use:reveal data-reveal>Same buses, different days</h2>
        <p class="lede" use:reveal data-reveal>
          Every persona makes the same weekly trips under the same timetable. What differs is where they live, where they go and when.
          Pick a measure and a way of slicing the population.
        </p>
        <div class="metrics seg" role="group" aria-label="Metric">
          {#each METRICS as m}
            <button aria-pressed={app.metric === m.key} onclick={() => (app.metric = m.key)}>{m.short}</button>
          {/each}
        </div>
        <GapChart bundle={base} />
      </div>
    </section>

    <section class="section" id="where">
      <div class="wrap">
        <div class="kicker" use:reveal data-reveal><b>02</b> Where routes go</div>
        <h2 use:reveal data-reveal>The map is not neutral</h2>
        <p class="lede" use:reveal data-reveal>
          Neighborhoods are shaded by how the simulated residents living there fare. Line weight on a route follows its weekday trips.
        </p>
        <SiteMap {bundle} {city} {hasRedesign} />
      </div>
    </section>

    <section class="section" id="when">
      <div class="wrap">
        <div class="kicker" use:reveal data-reveal><b>03</b> When they run</div>
        <h2 use:reveal data-reveal>Service has a bedtime</h2>
        <p class="lede" use:reveal data-reveal>
          Failures cluster in the hours when service thins out. Groups whose work or study schedules fall there carry the cost.
        </p>
        <TimeOfDay bundle={bundle} />
      </div>
    </section>

    {#if comparison}
      <section class="section" id="redesign">
        <div class="wrap">
          <div class="kicker" use:reveal data-reveal><b>04</b> Who gets left out</div>
          <h2 use:reveal data-reveal>Redrawing the network</h2>
          <p class="lede" use:reveal data-reveal>
            Redesign v1 edits the Ann Arbor timetable to add late-night and crosstown service, then reruns the same simulation.
            Did it help the people the baseline fails most, and what did it cost everyone else?
          </p>
          <Redesign {comparison} />
        </div>
      </section>
    {/if}

    {#if second && bundles['ann_arbor/baseline'] && bundles[`${second.slug}/baseline`]}
      <section class="section" id="elsewhere">
        <div class="wrap">
          <div class="kicker" use:reveal data-reveal><b>05</b> Not inevitable</div>
          <h2 use:reveal data-reveal>Another college town</h2>
          <p class="lede" use:reveal data-reveal>
            The same pipeline run on {second.display_name}. Towns differ in size and density, so the comparison is about the shape of the gaps rather than raw minutes.
          </p>
          <Elsewhere a={bundles['ann_arbor/baseline']} b={bundles[`${second.slug}/baseline`]} ca={index.cities[0]} cb={second} />
        </div>
      </section>
    {/if}

    <section class="section" id="hypotheses">
      <div class="wrap">
        <div class="kicker" use:reveal data-reveal><b>06</b> Stated up front</div>
        <h2 use:reveal data-reveal>Hypotheses that can fail</h2>
        <p class="lede" use:reveal data-reveal>Written before running anything. A hypothesis the data does not support is a finding, not a problem.</p>
        <Hypotheses />
      </div>
    </section>

    <section class="section" id="method">
      <div class="wrap method">
        <div>
          <div class="kicker" use:reveal data-reveal><b>07</b> Method</div>
          <h2 use:reveal data-reveal>How this was made</h2>
        </div>
        <div use:reveal data-reveal>
          <ol>
            <li><b>Personas.</b> 1,000 synthetic people per replicate, each with a group, a home and a workplace or campus anchor, drawn from Census, housing and enrollment data.</li>
            <li><b>Trips.</b> A weekly routine per person: commute or class, and the return, with shift patterns setting departure times.</li>
            <li><b>Routing.</b> Every trip routed door to door over GTFS and OpenStreetMap with r5py. A trip that cannot be completed counts as a failure, not a missing row.</li>
            <li><b>Replication.</b> 100 replicates (seeds 42 to 141) give 95% intervals on every metric.</li>
          </ol>
          <h3>Limits, plainly</h3>
          <ul>
            <li>The model uses scheduled service, not real service. It does not capture lateness or crowding; ride-alongs address those.</li>
            <li>Transit only. “Failure” means no transit option, not no way to travel.</li>
            <li>Synthetic people show what the system’s design does to a plausible population, not what residents actually experience.</li>
          </ul>
        </div>
      </div>
    </section>
  </main>

  <Footer />
{/if}

<style>
  .fake { background: var(--maize); color: var(--blue); font-size: 13px; text-align: center; padding: 7px var(--gutter); }
  .state { min-height: 100vh; display: grid; place-content: center; text-align: center; background: var(--blue); color: #fff; padding: 24px; }
  .spin { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.2); border-top-color: var(--maize); animation: s 0.8s linear infinite; }
  @keyframes s { to { transform: rotate(360deg); } }
  .metrics { margin: 28px 0 18px; }
  .method { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(28px, 6vw, 80px); }
  .method ol { padding-left: 1.2em; margin: 0 0 32px; display: grid; gap: 14px; }
  .method ul { padding-left: 1.2em; display: grid; gap: 8px; color: #36424f; }
  .method h3 { font-size: 24px; margin-bottom: 14px; }
  @media (max-width: 800px) { .method { grid-template-columns: 1fr; } }
</style>
