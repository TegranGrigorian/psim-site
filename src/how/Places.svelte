<script lang="ts">
  import * as maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import { onMount } from 'svelte';
  import { reveal } from '../lib/actions';
  import { GROUP_COLOR, GROUP_LABEL, label } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { prep, sliceTo } from '../lib/routeAnim';
  import { rng, weighted } from '../lib/rng';
  import type { Inputs } from './inputs';

  let { inputs }: { inputs: Inputs } = $props();
  maplibregl.setWorkerUrl(workerUrl);

  const BASEMAP = 'https://tiles.openfreemap.org/styles/positron';
  const BOUNDS: [number, number, number, number] = [-83.8, 42.225, -83.665, 42.325];
  const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
  const FALLBACK = [0.2, 0.1, 0.1, 0.3, 0.15, 0.15];
  const SPAWN_MS = 1600; // a new person every 1.6 s

  // Same rules as the generator: homes weighted by housing units, destinations by jobs or building size.
  // Students live in dorms or rentals; staff go to university jobs, shift workers to shift jobs,
  // resident workers to other daytime jobs, and retired residents have no fixed destination.
  const shares = $derived(GROUPS.map((g, i) => inputs.group_shares?.[g] ?? FALLBACK[i]));
  const W_COL: Record<string, 3 | 4 | 5> = { resident_worker: 3, shift_worker: 4, university_staff: 5 };

  function pickTrip(r: () => number, gi: number) {
    const g = GROUPS[gi];
    const student = gi <= 1;
    const home = inputs.homes[weighted(r, inputs.homes.map((h) => (student ? h[2] : h[3])))];
    let to: { lon: number; lat: number; name: string } | null = null;
    if (student) {
      const c = inputs.campus[weighted(r, inputs.campus.map((c) => c[2]))];
      to = { lon: c[0], lat: c[1], name: c[3] || 'a campus building' };
    } else if (W_COL[g]) {
      const col = W_COL[g];
      const w = inputs.work[weighted(r, inputs.work.map((w) => w[col]))];
      to = { lon: w[0], lat: w[1], name: w[6] || (col === 5 ? 'a university workplace' : 'a workplace') };
    }
    return { home, to };
  }

  /** A gentle arc from a to b, so overlapping trips stay distinguishable. Straight-line distance in metres. */
  function arc(a: number[], b: number[]) {
    const k = Math.cos((a[1] * Math.PI) / 180);
    const dx = (b[0] - a[0]) * k, dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) * 111_320;
    const c = [(a[0] + b[0]) / 2 - (dy * 0.18) / k, (a[1] + b[1]) / 2 + dx * 0.18];
    const pts: number[][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return { pts, m };
  }

  type Live = { g: string; line: ReturnType<typeof prep> | null; home: number[]; t0: number; dur: number };
  let live: Live[] = [];
  let trails: { g: string; c: number[][] }[] = [];
  let counts = $state(GROUPS.map(() => 0));
  let last = $state('');
  let el: HTMLDivElement;

  /** Point features with a radius `r` (px) scaled by the square root of the weight, relative to the layer's largest. */
  function sized(rows: { lon: number; lat: number; w: number }[], rMin: number, rMax: number) {
    const max = Math.max(1, ...rows.map((x) => x.w));
    return {
      type: 'FeatureCollection',
      features: rows
        .sort((a, b) => b.w - a.w) // big circles underneath small ones
        .map((x) => ({ type: 'Feature', properties: { r: rMin + (rMax - rMin) * Math.sqrt(x.w / max) }, geometry: { type: 'Point', coordinates: [x.lon, x.lat] } })),
    } as any;
  }
  const zoomR: any = ['interpolate', ['linear'], ['zoom'], 11, ['*', 0.75, ['get', 'r']], 14, ['get', 'r'], 16, ['*', 1.6, ['get', 'r']]];

  onMount(() => {
    const map = new maplibregl.Map({ container: el, style: BASEMAP, bounds: BOUNDS, fitBoundsOptions: { padding: 16 }, attributionControl: { compact: true }, cooperativeGestures: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const r = rng(42);
    let raf = 0, timer = 0, visible = false, loaded = false;
    const fc = (features: any[]) => ({ type: 'FeatureCollection', features }) as any;

    function spawn() {
      const gi = weighted(r, shares);
      const { home, to } = pickTrip(r, gi);
      const from = [home[0], home[1]];
      const a = to ? arc(from, [to.lon, to.lat]) : null;
      // longer trips take longer on screen, within limits
      const dur = a ? Math.min(5200, Math.max(2200, (a.m * 1.3) / 2.2)) : 2400;
      live.push({ g: GROUPS[gi], line: a ? prep(a.pts) : null, home: from, t0: performance.now(), dur });
      counts[gi]++;
      const where = label(home[4]);
      last = `${GROUP_LABEL[GROUPS[gi]].replace(/s$/, '')} · home in ${where}${to ? ` → ${to.name}${a ? ` · ${(a.m / 1609).toFixed(1)} mi as the crow flies` : ''}` : ' · stays local, no fixed destination'}`;
    }

    function frame(now: number) {
      const heads: any[] = [], active: any[] = [], pulses: any[] = [];
      live = live.filter((t) => {
        const f = Math.min(1, (now - t.t0) / t.dur);
        if (!t.line) {
          pulses.push({ type: 'Feature', properties: { c: GROUP_COLOR[t.g], r: 4 + f * 16, o: 1 - f }, geometry: { type: 'Point', coordinates: t.home } });
          return f < 1;
        }
        const e = 1 - Math.pow(1 - f, 2); // ease out: slow down on arrival
        const c = sliceTo(t.line, e);
        active.push({ type: 'Feature', properties: { c: GROUP_COLOR[t.g], o: 0.95 }, geometry: { type: 'LineString', coordinates: c } });
        heads.push({ type: 'Feature', properties: { c: GROUP_COLOR[t.g] }, geometry: { type: 'Point', coordinates: c[c.length - 1] } });
        if (f >= 1) { trails.push({ g: t.g, c: t.line.coords }); trails = trails.slice(-24); }
        return f < 1;
      });
      const old = trails.map((t, i) => ({ type: 'Feature', properties: { c: GROUP_COLOR[t.g], o: 0.25 + (0.4 * (i + 1)) / trails.length }, geometry: { type: 'LineString', coordinates: t.c } }));
      (map.getSource('pl-trails') as maplibregl.GeoJSONSource).setData(fc([...old, ...active]));
      (map.getSource('pl-heads') as maplibregl.GeoJSONSource).setData(fc(heads));
      (map.getSource('pl-pulse') as maplibregl.GeoJSONSource).setData(fc(pulses));
    }
    const loop = (now: number) => { frame(now); if (visible) raf = requestAnimationFrame(loop); };
    function start() {
      if (!loaded || !visible) return;
      if (reducedMotion()) { for (let i = 0; i < 20; i++) { spawn(); live[live.length - 1].t0 = -1e9; } frame(performance.now()); return; }
      if (!counts.some(Boolean)) spawn();
      clearInterval(timer);
      timer = window.setInterval(spawn, SPAWN_MS);
      raf = requestAnimationFrame(loop);
    }
    function stop() { clearInterval(timer); cancelAnimationFrame(raf); }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.3 });
    io.observe(el);

    map.on('load', () => {
      map.addSource('pl-trails', { type: 'geojson', data: fc([]) });
      map.addSource('pl-heads', { type: 'geojson', data: fc([]) });
      map.addSource('pl-pulse', { type: 'geojson', data: fc([]) });
      map.addSource('pl-homes', { type: 'geojson', data: sized(inputs.homes.map((h) => ({ lon: h[0], lat: h[1], w: Math.max(h[2], h[3]) })), 1.5, 8) });
      map.addSource('pl-work', { type: 'geojson', data: sized(inputs.work.map((w) => ({ lon: w[0], lat: w[1], w: w[2] })), 1.5, 8) });
      map.addSource('pl-campus', { type: 'geojson', data: sized(inputs.campus.map((c) => ({ lon: c[0], lat: c[1], w: c[2] })), 2, 9) });
      map.addLayer({ id: 'pl-work', type: 'circle', source: 'pl-work', paint: { 'circle-radius': zoomR, 'circle-color': '#00274C', 'circle-opacity': 0.55, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 0.8 } });
      map.addLayer({ id: 'pl-homes', type: 'circle', source: 'pl-homes', paint: { 'circle-radius': zoomR, 'circle-color': '#ffffff', 'circle-opacity': 0.85, 'circle-stroke-color': '#00274C', 'circle-stroke-width': 1.2 } });
      map.addLayer({ id: 'pl-campus', type: 'circle', source: 'pl-campus', paint: { 'circle-radius': zoomR, 'circle-color': '#FFCB05', 'circle-opacity': 0.85, 'circle-stroke-color': '#00274C', 'circle-stroke-width': 1 } });
      map.addLayer({ id: 'pl-trails', type: 'line', source: 'pl-trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-opacity': ['get', 'o'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 6] } });
      map.addLayer({ id: 'pl-pulse', type: 'circle', source: 'pl-pulse', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'c'], 'circle-opacity': ['*', 0.35, ['get', 'o']], 'circle-stroke-color': ['get', 'c'], 'circle-stroke-width': 2, 'circle-stroke-opacity': ['get', 'o'] } });
      map.addLayer({ id: 'pl-heads', type: 'circle', source: 'pl-heads', paint: { 'circle-radius': 6.5, 'circle-color': ['get', 'c'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
      loaded = true;
      start();
    });
    return () => { stop(); io.disconnect(); map.remove(); };
  });
</script>

<div class="card pl" use:reveal data-reveal>
  <div class="map" bind:this={el}></div>
  <p class="last" aria-live="off">{last || ' '}</p>
  <div class="keys">
    <span><i class="k-home"></i>Homes (bigger = more housing units)</span>
    <span><i class="k-work"></i>Workplaces (bigger = more jobs)</span>
    <span><i class="k-campus"></i>Campus buildings (bigger = larger building)</span>
  </div>
  <p class="tl">People placed so far in this animation (one every couple of seconds while the map is on screen):</p>
  <ul class="tally">
    {#each GROUPS as g, gi}<li><i style="background:{GROUP_COLOR[g]}"></i>{GROUP_LABEL[g]} <b>{counts[gi]}</b></li>{/each}
  </ul>
  <p class="src">
    Homes: 2020 Census housing counts for each city block. Jobs: the Census Bureau’s count of jobs on each block (LEHD/LODES).
    Campus buildings: OpenStreetMap. The lines are drawn as simple arcs from home to destination; the simulation itself routes every
    trip along real streets and bus lines. These inputs are still being checked, so treat them as preliminary.
  </p>
</div>

<style>
  .pl { padding: clamp(14px, 2.5vw, 22px); }
  .map { height: clamp(360px, 52vh, 500px); border-radius: 10px; overflow: hidden; }
  .last { font-size: 14px; min-height: 1.5em; margin: 12px 0 8px; font-weight: 500; }
  .keys { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); }
  .keys i { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .k-home { border: 2px solid var(--blue); background: #fff; }
  .k-work { background: var(--blue); opacity: 0.7; }
  .k-campus { background: var(--maize); border: 2px solid var(--blue); }
  .tl { margin: 12px 0 0; font-size: 12.5px; color: var(--muted); }
  .tally { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
  .tally i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .tally b { font-variant-numeric: tabular-nums; margin-left: 2px; }
  .src { margin: 10px 0 0; font-size: 12px; color: var(--muted); }
</style>
