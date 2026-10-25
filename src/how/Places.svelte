<script lang="ts">
  import * as maplibregl from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import { onMount } from 'svelte';
  import { reveal } from '../lib/actions';
  import { GROUP_COLOR, GROUP_LABEL } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { prep, sliceTo } from '../lib/routeAnim';
  import { rng, weighted } from '../lib/rng';
  import type { Inputs } from './inputs';

  let { inputs }: { inputs: Inputs } = $props();
  maplibregl.setWorkerUrl(workerUrl);

  const BASEMAP = 'https://tiles.openfreemap.org/styles/positron';
  const BOUNDS: [number, number, number, number] = [-83.8, 42.225, -83.665, 42.325];
  const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
  const SHARES = [0.2, 0.1, 0.1, 0.3, 0.15, 0.15];
  const SPAWN_MS = 1600; // a new person every 1.6 s
  const isUni = (w: Inputs['workplaces'][number]) => w.is_university === true || w.is_university === 'true';

  // Road paths between every home and destination, precomputed by scripts/road-paths.mjs.
  let paths: Record<string, { m: number; c: number[][] }> = {};

  // Same rules as the generator: homes weighted by units, destinations by jobs or class capacity.
  function pickTrip(r: () => number, gi: number) {
    const g = GROUPS[gi];
    const student = gi <= 1;
    const homes = inputs.housing.filter((h) => (student ? h.tenure === 'dorm' || h.tenure === 'rent' : h.tenure !== 'dorm'));
    const home = homes[weighted(r, homes.map((h) => h.units))];
    let to: { id: string; lat: number; lon: number; name: string } | null = null;
    if (student) { const c = inputs.campus[weighted(r, inputs.campus.map((c) => c.capacity_weight))]; to = { id: c.campus_id, ...c }; }
    else if (g !== 'retired') {
      const pool = inputs.workplaces.filter((w) => (g === 'university_staff' ? isUni(w) : g === 'shift_worker' ? w.shift_pattern !== 'standard_day' : !isUni(w) && w.shift_pattern === 'standard_day'));
      if (pool.length) { const w = pool[weighted(r, pool.map((w) => w.jobs))]; to = { id: w.workplace_id, ...w }; }
    }
    return { home, to };
  }

  type Live = { g: string; line: ReturnType<typeof prep> | null; home: number[]; t0: number; dur: number };
  let live: Live[] = [];
  let trails: { g: string; c: number[][] }[] = [];
  let counts = $state(GROUPS.map(() => 0));
  let last = $state('');
  let el: HTMLDivElement;

  onMount(() => {
    const map = new maplibregl.Map({ container: el, style: BASEMAP, bounds: BOUNDS, fitBoundsOptions: { padding: 16 }, attributionControl: { compact: true }, cooperativeGestures: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const r = rng(42);
    let raf = 0, timer = 0, visible = false, loaded = false;
    const fc = (features: any[]) => ({ type: 'FeatureCollection', features }) as any;

    function spawn() {
      const gi = weighted(r, SHARES);
      const { home, to } = pickTrip(r, gi);
      const p = to ? paths[`${home.housing_id}>${to.id}`] : undefined;
      const coords = p?.c ?? (to ? [[home.lon, home.lat], [to.lon, to.lat]] : null);
      // longer trips take longer on screen, within limits
      const dur = p ? Math.min(5200, Math.max(2200, p.m / 2.2)) : 2400;
      live.push({ g: GROUPS[gi], line: coords ? prep(coords) : null, home: [home.lon, home.lat], t0: performance.now(), dur });
      counts[gi]++;
      const where = home.neighborhood.replace(/_/g, ' ');
      last = `${GROUP_LABEL[GROUPS[gi]].replace(/s$/, '')} · home in ${where}${to ? ` → ${to.name}${p ? ` · ${(p.m / 1609).toFixed(1)} mi by road` : ''}` : ' · stays local, no fixed destination'}`;
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
      const old = trails.map((t, i) => ({ type: 'Feature', properties: { c: GROUP_COLOR[t.g], o: 0.12 + (0.4 * (i + 1)) / trails.length }, geometry: { type: 'LineString', coordinates: t.c } }));
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

    Promise.all([
      fetch(`${import.meta.env.BASE_URL}how/ann_arbor_paths.json`).then((x) => x.json()).catch(() => ({})),
      new Promise((res) => map.on('load', res)),
    ]).then(([p]) => {
      paths = p as typeof paths;
      const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      const pt = (rows: { lon: number; lat: number }[], w: (x: any) => number) => fc(rows.map((x) => ({ type: 'Feature', properties: { w: w(x) }, geometry: { type: 'Point', coordinates: [x.lon, x.lat] } })));
      map.addSource('pl-trails', { type: 'geojson', data: fc([]) });
      map.addSource('pl-heads', { type: 'geojson', data: fc([]) });
      map.addSource('pl-pulse', { type: 'geojson', data: fc([]) });
      map.addSource('pl-homes', { type: 'geojson', data: pt(inputs.housing, (h) => h.units) });
      map.addSource('pl-work', { type: 'geojson', data: pt(inputs.workplaces, (w) => w.jobs) });
      map.addSource('pl-campus', { type: 'geojson', data: pt(inputs.campus, (c) => c.capacity_weight) });
      map.addLayer({ id: 'pl-trails', type: 'line', source: 'pl-trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-opacity': ['get', 'o'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 15, 5] } }, firstLabel);
      map.addLayer({ id: 'pl-homes', type: 'circle', source: 'pl-homes', paint: { 'circle-radius': ['+', 4, ['/', ['sqrt', ['get', 'w']], 4]], 'circle-color': '#ffffff', 'circle-stroke-color': '#00274C', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'pl-work', type: 'circle', source: 'pl-work', paint: { 'circle-radius': ['+', 3, ['/', ['sqrt', ['get', 'w']], 12]], 'circle-color': '#00274C', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } });
      map.addLayer({ id: 'pl-campus', type: 'circle', source: 'pl-campus', paint: { 'circle-radius': ['+', 4, ['*', 0.9, ['sqrt', ['get', 'w']]]], 'circle-color': '#FFCB05', 'circle-stroke-color': '#00274C', 'circle-stroke-width': 2 } });
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
    <span><i class="k-home"></i>Housing (size = units)</span>
    <span><i class="k-work"></i>Workplace (size = jobs)</span>
    <span><i class="k-campus"></i>Campus building</span>
  </div>
  <ul class="tally">
    {#each GROUPS as g, gi}<li><i style="background:{GROUP_COLOR[g]}"></i>{GROUP_LABEL[g]} <b>{counts[gi]}</b></li>{/each}
  </ul>
  <p class="src">Paths follow real streets (OpenStreetMap, routed with OSRM). Home and job locations are sample data.</p>
</div>

<style>
  .pl { padding: clamp(14px, 2.5vw, 22px); }
  .map { height: clamp(360px, 52vh, 500px); border-radius: 10px; overflow: hidden; }
  .last { font-size: 14px; min-height: 1.5em; margin: 12px 0 8px; font-weight: 500; }
  .keys { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); }
  .keys i { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .k-home { border: 2px solid var(--blue); background: #fff; }
  .k-work { background: var(--blue); }
  .k-campus { background: var(--maize); border: 2px solid var(--blue); }
  .tally { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
  .tally i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .tally b { font-variant-numeric: tabular-nums; margin-left: 2px; }
  .src { margin: 10px 0 0; font-size: 12px; color: var(--muted); }
</style>
