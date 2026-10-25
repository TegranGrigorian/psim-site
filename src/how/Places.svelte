<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { GROUP_COLOR, GROUP_LABEL } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { rng, weighted } from '../lib/rng';
  import type { Bundle } from '../lib/types';
  import type { Inputs } from './inputs';

  let { inputs, bundle }: { inputs: Inputs; bundle: Bundle } = $props();

  // Equirectangular projection over the neighborhood extent, corrected for latitude.
  const W = 600;
  const ext = $derived.by(() => {
    const xs = bundle.hoods.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[0]));
    const ys = bundle.hoods.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[1]));
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  const k = $derived(Math.cos((((ext[1] + ext[3]) / 2) * Math.PI) / 180));
  const H = $derived(Math.round((W * (ext[3] - ext[1])) / ((ext[2] - ext[0]) * k)));
  const px = (lon: number, lat: number): [number, number] => [((lon - ext[0]) / (ext[2] - ext[0])) * W, ((ext[3] - lat) / (ext[3] - ext[1])) * H];
  const poly = (ring: number[][]) => 'M' + ring.map(([x, y]) => px(x, y).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z';

  const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
  const SHARES = [0.2, 0.1, 0.1, 0.3, 0.15, 0.15];
  const isUni = (w: Inputs['workplaces'][number]) => w.is_university === true || w.is_university === 'true';

  // Which homes and anchors each group can draw from. Weight = units / jobs / capacity.
  function pickTrip(r: () => number, gi: number) {
    const g = GROUPS[gi];
    const student = gi <= 1;
    const homes = inputs.housing.filter((h) => (student ? h.tenure === 'dorm' || h.tenure === 'rent' : h.tenure !== 'dorm'));
    const home = homes[weighted(r, homes.map((h) => h.units))];
    let to: { lat: number; lon: number; name: string } | null;
    if (student) to = inputs.campus[weighted(r, inputs.campus.map((c) => c.capacity_weight))];
    else if (g === 'retired') to = null;
    else {
      const pool = inputs.workplaces.filter((w) => (g === 'university_staff' ? isUni(w) : g === 'shift_worker' ? w.shift_pattern !== 'standard_day' : !isUni(w) && w.shift_pattern === 'standard_day'));
      to = pool.length ? pool[weighted(r, pool.map((w) => w.jobs))] : null;
    }
    return { home, to };
  }

  type Trip = { id: number; g: string; d: string; h: [number, number]; still: boolean };
  let trips = $state<Trip[]>([]);
  let counts = $state(GROUPS.map(() => 0));
  let last = $state('');
  let running = false, timer = 0, n = 0;
  const r = rng(42);

  function spawn() {
    const gi = weighted(r, SHARES);
    const { home, to } = pickTrip(r, gi);
    const h = px(home.lon, home.lat);
    // jitter so people from the same building don't stack exactly
    h[0] += (r() - 0.5) * 18; h[1] += (r() - 0.5) * 18;
    let d = '';
    if (to) {
      const a = px(to.lon, to.lat);
      const mx = (h[0] + a[0]) / 2, my = (h[1] + a[1]) / 2 - Math.hypot(a[0] - h[0], a[1] - h[1]) * 0.35;
      d = `M${h[0].toFixed(1)} ${h[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
    }
    trips = [...trips.slice(-34), { id: n++, g: GROUPS[gi], d, h, still: !to }];
    counts[gi]++;
    last = `${GROUP_LABEL[GROUPS[gi]].replace(/s$/, '')} · home in ${home.neighborhood.replace(/_/g, ' ')}${to ? ` → ${to.name}` : ' · no fixed destination'}`;
  }
  function run(on: boolean) {
    if (on && !running) {
      running = true;
      if (reducedMotion()) { for (let i = 0; i < 35; i++) spawn(); return; }
      if (!n) for (let i = 0; i < 6; i++) spawn();
      timer = window.setInterval(spawn, 420);
    } else if (!on && running) { running = false; clearInterval(timer); }
  }
  $effect(() => () => clearInterval(timer));
</script>

<div class="card pl" use:reveal data-reveal use:inView={run}>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Map of homes, workplaces and campus locations with trips drawn between them">
    {#each bundle.hoods.features as f}
      <path class="hood" d={poly(f.geometry.coordinates[0])} />
    {/each}
    {#each bundle.hoods.features as f}
      {@const ring = f.geometry.coordinates[0]}
      {@const c = px(ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length)}
      <text class="hl" x={c[0]} y={c[1]}>{f.properties.name}</text>
    {/each}
    {#each inputs.housing as h}
      {@const [x, y] = px(h.lon, h.lat)}
      <circle class="home" cx={x} cy={y} r={3 + Math.sqrt(h.units) / 5} />
    {/each}
    {#each inputs.workplaces as w}
      {@const [x, y] = px(w.lon, w.lat)}
      {@const s = 4 + Math.sqrt(w.jobs) / 12}
      <rect class="work" x={x - s / 2} y={y - s / 2} width={s} height={s} rx="2" />
    {/each}
    {#each inputs.campus as c}
      {@const [x, y] = px(c.lon, c.lat)}
      {@const s = 5 + Math.sqrt(c.capacity_weight) * 1.4}
      <rect class="campus" x={x - s / 2} y={y - s / 2} width={s} height={s} transform="rotate(45 {x} {y})" />
    {/each}
    {#each trips as t (t.id)}
      {#if t.still}
        <circle class="pulse" cx={t.h[0]} cy={t.h[1]} r="4" style="--c:{GROUP_COLOR[t.g]}" />
      {:else}
        <path class="arc" d={t.d} pathLength="1" style="stroke:{GROUP_COLOR[t.g]}" />
        <circle class="who" r="4" style="offset-path:path('{t.d}'); fill:{GROUP_COLOR[t.g]}" />
      {/if}
    {/each}
  </svg>
  <p class="last" aria-live="off">{last || ' '}</p>
  <div class="keys">
    <span><i class="k-home"></i>Housing (size = units)</span>
    <span><i class="k-work"></i>Workplace (size = jobs)</span>
    <span><i class="k-campus"></i>Campus building</span>
  </div>
  <ul class="tally">
    {#each GROUPS as g, gi}<li><i style="background:{GROUP_COLOR[g]}"></i>{GROUP_LABEL[g]} <b>{counts[gi]}</b></li>{/each}
  </ul>
</div>

<style>
  .pl { padding: clamp(14px, 2.5vw, 22px); }
  svg { width: 100%; display: block; background: #f6f3ea; border-radius: 10px; }
  .hood { fill: #ece7d8; stroke: #fff; stroke-width: 2; }
  .hl { font-size: 11px; fill: #a39c86; text-anchor: middle; font-weight: 600; letter-spacing: 0.02em; }
  .home { fill: #fff; stroke: var(--blue); stroke-width: 1.5; }
  .work { fill: var(--blue); }
  .campus { fill: var(--maize); stroke: var(--blue); stroke-width: 1.5; }
  .arc { fill: none; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0.75; animation: draw 1.1s var(--ease) forwards, dim 14s linear forwards; }
  .who { offset-distance: 0%; animation: ride 1.1s var(--ease) forwards; stroke: #fff; stroke-width: 1.5; }
  .pulse { fill: var(--c); animation: pulse 1.6s ease-out 2; opacity: 0.8; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes dim { to { opacity: 0.12; } }
  @keyframes ride { to { offset-distance: 100%; } }
  @keyframes pulse { 0% { r: 3; opacity: 1; } 100% { r: 14; opacity: 0; } }
  .last { font-size: 14px; min-height: 1.5em; margin: 12px 0 8px; font-weight: 500; text-transform: none; }
  .keys { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); }
  .keys i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; vertical-align: -1px; }
  .k-home { border-radius: 50%; border: 1.5px solid var(--blue); background: #fff; }
  .k-work { background: var(--blue); border-radius: 2px; }
  .k-campus { background: var(--maize); border: 1.5px solid var(--blue); transform: rotate(45deg) scale(0.85); }
  .tally { list-style: none; padding: 0; margin: 14px 0 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
  .tally i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .tally b { font-variant-numeric: tabular-nums; margin-left: 2px; }
</style>
