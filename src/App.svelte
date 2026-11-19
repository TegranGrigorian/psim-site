<script lang="ts">
  import { onMount } from 'svelte';
  import Nav from './components/Nav.svelte';
  import Hero from './components/Hero.svelte';
  import GapChart from './components/GapChart.svelte';
  import TimeOfDay from './components/TimeOfDay.svelte';
  import Redesign from './components/Redesign.svelte';
  import Elsewhere from './components/Elsewhere.svelte';
  import Hypotheses from './components/Hypotheses.svelte';
  import Pending from './components/Pending.svelte';
  import Footer from './components/Footer.svelte';
  import type SiteMapComponent from './components/SiteMap.svelte';
  import { nearView, reveal } from './lib/actions';
  import { app } from './lib/state.svelte';
  import { METRICS } from './lib/format';
  import { hasScenario, loadComparison, loadCore, loadGeo, loadIndex, loadMeta, loadReport, loadScenarioSpec } from './lib/data';
  import type { CityMeta, Comparison, Core, Geo, Index, Report, ScenarioSpec } from './lib/types';

  // Nothing here waits on data before drawing: the hero paints at once, each section fills in when
  // its (small) file arrives, and the map code (MapLibre) and map files load only near the map.
  let index = $state<Index>();
  let core = $state<Record<string, Core>>({});
  let geo = $state<Record<string, Geo>>({});
  let comparison = $state<Comparison | null>();
  let spec = $state<ScenarioSpec | null>();
  let report = $state<Report | null>();
  let meta = $state<Record<string, CityMeta | null>>({});
  let error = $state('');
  let SiteMap = $state<typeof SiteMapComponent>();
  let mapWanted = $state(false);

  const keep = <T,>(store: Record<string, T>, key: string, p: Promise<T>) =>
    p.then((v) => (store[key] = v)).catch((e) => (error = String(e)));

  onMount(() => {
    // started together with the index rather than after it: baseline Ann Arbor is the page's default
    const first = loadCore(app.city, 'baseline');
    loadIndex()
      .then((idx) => {
        index = idx;
        if (!idx.cities.length) error = 'The data index lists no cities.';
        else if (!hasScenario(idx, app.city, 'baseline')) app.city = idx.cities[0].slug;
      })
      .catch((e) => (error = String(e)));
    first.catch(() => {}); // reported by the effect below if the index really lists it
    loadReport().then((r) => (report = r));
  });

  const city = $derived(index?.cities.find((c) => c.slug === app.city));
  const scenario = $derived(hasScenario(index, app.city, app.scenario) ? app.scenario : 'baseline');
  const hasRedesign = $derived(hasScenario(index, app.city, 'redesign_v1'));
  const second = $derived(index?.cities.find((c) => c.slug !== 'ann_arbor' && c.scenarios.includes('baseline')));
  const aa = $derived(hasScenario(index, 'ann_arbor', 'baseline'));

  $effect(() => {
    if (!city) return;
    for (const s of new Set(['baseline', scenario])) if (!core[`${city.slug}/${s}`]) keep(core, `${city.slug}/${s}`, loadCore(city.slug, s));
  });
  $effect(() => {
    if (second && !core[`${second.slug}/baseline`]) keep(core, `${second.slug}/baseline`, loadCore(second.slug, 'baseline'));
  });
  $effect(() => {
    if (hasRedesign && comparison === undefined) {
      loadComparison('ann_arbor', 'redesign_v1').then((c) => (comparison = c));
      loadScenarioSpec('ann_arbor', 'redesign_v1').then((x) => (spec = x));
    }
  });
  $effect(() => {
    for (const c of index?.cities ?? []) if (!(c.slug in meta)) { meta[c.slug] = null; loadMeta(c.slug).then((m) => (meta[c.slug] = m)); }
  });
  $effect(() => {
    if (!mapWanted || !city) return;
    for (const s of new Set(['baseline', scenario])) if (!geo[`${city.slug}/${s}`]) keep(geo, `${city.slug}/${s}`, loadGeo(city.slug, s));
  });
  function wantMap() {
    mapWanted = true;
    import('./components/SiteMap.svelte').then((m) => (SiteMap = m.default)).catch((e) => (error = String(e)));
  }

  const base = $derived(city ? core[`${city.slug}/baseline`] : undefined);
  const now = $derived(city ? core[`${city.slug}/${scenario}`] ?? base : undefined);
  const geoNow = $derived(city ? geo[`${city.slug}/${scenario}`] ?? geo[`${city.slug}/baseline`] : undefined);
  const geoBase = $derived(city ? geo[`${city.slug}/baseline`] : undefined);
  const name = $derived(city?.display_name ?? 'Ann Arbor, MI');
  // Method facts, read from the data rather than typed in
  const nRep = $derived(base?.groupMetrics.n_replicates);
  const seeds = $derived.by(() => { const s = city ? meta[city.slug]?.seeds : null; return s && nRep && s[1] - s[0] + 1 === nRep ? s : null; });
  const people = $derived((city ? meta[city.slug]?.population_size : null)?.toLocaleString('en-US') ?? '1,000');
  const AGENCY: Record<string, string> = { ann_arbor: 'TheRide', madison: 'Madison Metro' };
  const reliability = $derived((index?.cities ?? []).flatMap((c) => { const v = meta[c.slug]?.on_time_share; return v ? [`${AGENCY[c.slug] ?? c.display_name} ${Math.round(v * 100)}%`] : []; }));
</script>

{#if index?.fake}
  <div class="fake" role="note"><b>Preview build.</b> The input data is still being checked, so these numbers are preliminary, not research results.</div>
{/if}
<Nav cities={index?.cities ?? []} />
<div id="top"></div>
<Hero metrics={base?.groupMetrics} cityName={name} />

<main>
  {#if error}
    <div class="wrap"><div class="err card" role="alert"><b>Some data could not be loaded.</b> {error}</div></div>
  {/if}

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
      {#if base}<GapChart metrics={base.groupMetrics} />{:else}<div class="card skel" style="height:420px"></div>{/if}
    </div>
  </section>

  <section class="section" id="where">
    <div class="wrap">
      <div class="kicker" use:reveal data-reveal><b>02</b> Where routes go</div>
      <h2 use:reveal data-reveal>The map is not neutral</h2>
      <p class="lede" use:reveal data-reveal>
        Neighborhoods are shaded by how the simulated residents living there fare. Line weight on a route follows its weekday trips.
      </p>
      <div use:nearView={wantMap}>
        {#if SiteMap && city && geoNow && geoBase}
          <SiteMap bundle={geoNow} base={geoBase} {city} {hasRedesign} />
        {:else}
          <div class="card skel map-skel"><span>Loading the map…</span></div>
        {/if}
      </div>
    </div>
  </section>

  <section class="section" id="when">
    <div class="wrap">
      <div class="kicker" use:reveal data-reveal><b>03</b> When they run</div>
      <h2 use:reveal data-reveal>Service has a bedtime</h2>
      <p class="lede" use:reveal data-reveal>
        Failures cluster in the hours when service thins out. Groups whose work or study schedules fall there carry the cost.
      </p>
      {#if now}<TimeOfDay tod={now.tod} />{:else}<div class="card skel" style="height:380px"></div>{/if}
    </div>
  </section>

  <section class="section" id="redesign">
    <div class="wrap">
      <div class="kicker" use:reveal data-reveal><b>04</b> Who gets left out</div>
      <h2 use:reveal data-reveal>Redrawing the network</h2>
      {#if hasRedesign && comparison}
        <p class="lede" use:reveal data-reveal>
          Redesign v1 makes one targeted edit to the Ann Arbor timetable, aimed at the neighborhood where trips failed most often,
          then reruns the exact same simulated towns. Did it help there, and did anyone else lose out?
        </p>
        <Redesign {comparison} {spec} />
      {:else}
        <p class="lede" use:reveal data-reveal>
          The plan: edit the Ann Arbor timetable where trips fail most, rerun the exact same simulated town, and see who gains and who loses.
        </p>
        <Pending title="Not simulated yet">
          The redesigned network hasn’t been run through the simulation so far. This section will fill in after that run.
        </Pending>
      {/if}
    </div>
  </section>

  <section class="section" id="elsewhere">
    <div class="wrap">
      <div class="kicker" use:reveal data-reveal><b>05</b> Not inevitable</div>
      <h2 use:reveal data-reveal>Another college town</h2>
      {#if second && aa && core['ann_arbor/baseline'] && core[`${second.slug}/baseline`] && index}
        <p class="lede" use:reveal data-reveal>
          The same pipeline run on {second.display_name}. Towns differ in size and density, so the comparison is about the shape of the gaps rather than raw minutes.
        </p>
        <Elsewhere a={core['ann_arbor/baseline'].groupMetrics} b={core[`${second.slug}/baseline`].groupMetrics} ca={index.cities.find((c) => c.slug === 'ann_arbor') ?? index.cities[0]} cb={second} />
      {:else}
        <p class="lede" use:reveal data-reveal>
          The same pipeline will be run on a second college town, Madison, to see whether Ann Arbor’s gaps are a choice or a given.
        </p>
        <Pending title="Not simulated yet">
          The comparison city hasn’t been run through the simulation so far. This section will fill in after that run.
        </Pending>
      {/if}
    </div>
  </section>

  <section class="section" id="hypotheses">
    <div class="wrap">
      <div class="kicker" use:reveal data-reveal><b>06</b> Stated up front</div>
      <h2 use:reveal data-reveal>Hypotheses that can fail</h2>
      <p class="lede" use:reveal data-reveal>Written before running anything. A hypothesis the data does not support is a finding, not a problem.</p>
      <Hypotheses {report} />
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
          <li><b>Personas.</b> {people} synthetic people per replicate, each with a group, a home and a workplace or campus anchor, drawn from Census, housing and enrollment data.</li>
          <li><b>Trips.</b> A weekly routine per person: commute or class, and the return, with shift patterns setting departure times.</li>
          <li><b>Routing.</b> Every trip routed door to door over GTFS and OpenStreetMap with r5py. A trip that cannot be completed counts as a failure, not a missing row.</li>
          <li><b>Delays.</b> Buses run late. On-time arrival comes from a delay model calibrated to each agency’s published on-time rate{#if reliability.length}{' '}({reliability.join(', ')}){/if}; U-M buses publish no figure, so the same is assumed for them.</li>
          <li><b>Replication.</b> {#if nRep}{nRep} replicates{#if seeds}{' '}(seeds {seeds[0]} to {seeds[1]}){/if}{:else}Many replicates{/if} give 95% intervals on every metric.{#if index?.fake}{' '}These are preliminary runs; more are planned.{/if}</li>
        </ol>
        <h3>Limits, plainly</h3>
        <ul>
          <li>Lateness is modelled from published averages, not from real trip-by-trip data, and crowding (a full bus passing riders by) is not modelled at all; ride-alongs address both.</li>
          <li>Transit only. “Failure” means no transit option, not no way to travel.</li>
          <li>Synthetic people show what the system’s design does to a plausible population, not what residents actually experience.</li>
        </ul>
        <a class="walk" href="./how.html">See the full walkthrough, step by step <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>
</main>

<Footer />

<style>
  .fake { background: var(--maize); color: var(--blue); font-size: 13px; text-align: center; padding: 7px var(--gutter); }
  .err { margin-top: 32px; padding: 14px 18px; border-color: #e0b4ab; background: #fbe7e3; color: #8e2a1c; font-size: 15px; }
  .skel { background: linear-gradient(100deg, #fff 30%, #f3f0e6 50%, #fff 70%) 0 0 / 300% 100%; animation: shimmer 1.6s linear infinite; }
  .map-skel { min-height: 520px; display: grid; place-items: center; color: var(--muted); font-size: 14px; }
  @keyframes shimmer { to { background-position: -150% 0; } }
  .metrics { margin: 28px 0 18px; }
  .method { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(28px, 6vw, 80px); }
  .method ol { padding-left: 1.2em; margin: 0 0 32px; display: grid; gap: 14px; }
  .method ul { padding-left: 1.2em; display: grid; gap: 8px; color: #36424f; }
  .method h3 { font-size: 24px; margin-bottom: 14px; }
  .walk { display: inline-flex; gap: 10px; align-items: center; margin-top: 18px; background: var(--blue); color: #fff; text-decoration: none; font-weight: 600; padding: 12px 20px; border-radius: 999px; transition: transform 0.25s var(--ease), background 0.25s; }
  .walk:hover { transform: translateY(-2px); background: var(--blue-2); }
  .walk span { color: var(--maize); transition: transform 0.25s var(--ease); }
  .walk:hover span { transform: translateX(3px); }
  @media (max-width: 800px) { .method { grid-template-columns: 1fr; } }
</style>
