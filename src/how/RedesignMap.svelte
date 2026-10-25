<script lang="ts">
  import * as maplibregl from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import { onMount } from 'svelte';
  import { HEAT } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { busesAt, DASH_FRAMES, prep, sliceTo, tracks } from '../lib/routeAnim';
  import type { Bundle } from '../lib/types';

  let { before, after }: { before: Bundle; after: Bundle } = $props();
  maplibregl.setWorkerUrl(workerUrl);

  const BASEMAP = 'https://tiles.openfreemap.org/styles/positron';
  const BOUNDS: [number, number, number, number] = [-83.8, 42.225, -83.665, 42.33];
  let showAfter = $state(false);
  let touched = false;
  let el: HTMLDivElement;
  let setView: (a: boolean) => void = () => {};

  const fr = (b: Bundle) => Object.fromEntries(b.hoods.features.map((f) => [f.properties.neighborhood, f.properties.metrics.failure_rate.mean]));
  const vb = $derived(fr(before)), va = $derived(fr(after));
  const all = $derived([...Object.values(vb), ...Object.values(va)]);
  const lo = $derived(Math.min(...all)), hi = $derived(Math.max(...all));
  const newRoutes = $derived(after.routes.features.filter((f) => f.properties.is_new));
  const fmt = (v: number) => `${(v * 100).toFixed(1)}%`;

  onMount(() => {
    const map = new maplibregl.Map({ container: el, style: BASEMAP, bounds: BOUNDS, fitBoundsOptions: { padding: 12 }, attributionControl: { compact: true }, cooperativeGestures: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const reduce = reducedMotion();
    let raf = 0, visible = false, k = 0, kTarget = 0, grow = 0, frame = 0, lastDash = 0, auto = 0;
    const lines = newRoutes.map((f) => prep(f.geometry.coordinates));
    const newTracks = tracks({ type: 'FeatureCollection', features: newRoutes });
    const t0 = performance.now();
    const fc = (features: any[]) => ({ type: 'FeatureCollection', features }) as any;
    // blend the two scenarios' failure rates by k (0 = before, 1 = after) inside the style expression
    const fill = (k: number): any => {
      const v = ['+', ['*', 1 - k, ['get', 'vb']], ['*', k, ['get', 'va']]];
      return ['interpolate', ['linear'], v, ...HEAT.flatMap((c, i) => [lo + ((hi - lo) * i) / (HEAT.length - 1), c])];
    };

    function draw(now: number) {
      k += (kTarget - k) * 0.08;
      if (Math.abs(kTarget - k) < 0.002) k = kTarget;
      grow = kTarget ? Math.min(1, grow + 0.012) : 0;
      map.setPaintProperty('rm-fill', 'fill-color', fill(k));
      const g = 1 - Math.pow(1 - grow, 3);
      (map.getSource('rm-new') as maplibregl.GeoJSONSource).setData(fc(grow ? lines.map((l, i) => ({ type: 'Feature', properties: { name: newRoutes[i].properties.route_short_name }, geometry: { type: 'LineString', coordinates: sliceTo(l, Math.max(0.001, g)) } })) : []));
      (map.getSource('rm-bus') as maplibregl.GeoJSONSource).setData(grow >= 1 ? (busesAt(newTracks, (now - t0) / 1000) as any) : fc([]));
      if (now - lastDash > 60) { frame = (frame + 1) % DASH_FRAMES.length; map.setPaintProperty('rm-flow', 'line-dasharray', DASH_FRAMES[frame]); lastDash = now; }
      if (visible) raf = requestAnimationFrame(draw);
    }
    setView = (a: boolean) => {
      showAfter = a; kTarget = a ? 1 : 0;
      if (reduce) { k = kTarget; grow = kTarget; draw(performance.now()); }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      clearInterval(auto);
      if (visible && map.loaded() && !reduce) {
        raf = requestAnimationFrame(draw);
        // flip between before and after until the reader takes over
        if (!touched) auto = window.setInterval(() => !touched && setView(!showAfter), 5000);
      }
    }, { threshold: 0.3 });

    map.on('load', () => {
      const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      map.addSource('rm-hoods', { type: 'geojson', data: fc(before.hoods.features.map((f) => ({ ...f, properties: { name: f.properties.name, vb: vb[f.properties.neighborhood], va: va[f.properties.neighborhood] } }))) });
      map.addSource('rm-routes', { type: 'geojson', data: before.routes as any });
      map.addSource('rm-new', { type: 'geojson', data: fc([]) });
      map.addSource('rm-bus', { type: 'geojson', data: fc([]) });
      map.addLayer({ id: 'rm-fill', type: 'fill', source: 'rm-hoods', paint: { 'fill-color': fill(0), 'fill-opacity': 0.55 } }, firstLabel);
      map.addLayer({ id: 'rm-edge', type: 'line', source: 'rm-hoods', paint: { 'line-color': '#fff', 'line-width': 1.2 } }, firstLabel);
      map.addLayer({ id: 'rm-routes', type: 'line', source: 'rm-routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#00274C', 'line-opacity': 0.45, 'line-width': 1.8 } });
      map.addLayer({ id: 'rm-new-case', type: 'line', source: 'rm-new', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 9 } });
      map.addLayer({ id: 'rm-new', type: 'line', source: 'rm-new', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#D86018', 'line-width': 5.5 } });
      map.addLayer({ id: 'rm-flow', type: 'line', source: 'rm-new', paint: { 'line-color': '#fff', 'line-width': 2.2, 'line-opacity': 0.8, 'line-dasharray': DASH_FRAMES[0] } });
      map.addLayer({ id: 'rm-bus', type: 'circle', source: 'rm-bus', paint: { 'circle-radius': 6, 'circle-color': '#D86018', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      io.observe(el);
    });
    return () => { cancelAnimationFrame(raf); clearInterval(auto); io.disconnect(); map.remove(); };
  });

  const choose = (a: boolean) => { touched = true; setView(a); };
  const changes = $derived(before.hoods.features
    .map((f) => ({ name: f.properties.name, b: vb[f.properties.neighborhood], a: va[f.properties.neighborhood] }))
    .sort((x, y) => (x.a - x.b) - (y.a - y.b)));
</script>

<div class="rm card">
  <div class="top">
    <div class="seg" role="group" aria-label="Network">
      <button aria-pressed={!showAfter} onclick={() => choose(false)}>Today’s network</button>
      <button aria-pressed={showAfter} onclick={() => choose(true)}>Redesign v1</button>
    </div>
    <span class="hint">{showAfter ? 'New routes in orange; shading shows the failure rate after the change' : 'Shading shows how often trips fail today'}</span>
  </div>
  <div class="grid">
    <div class="map" bind:this={el}>
      <div class="legend"><span>{fmt(lo)}</span><i style="background:linear-gradient(90deg,{HEAT.join(',')})"></i><span>{fmt(hi)}</span><em>trips that fail, by neighborhood</em></div>
    </div>
    <ol class="list">
      <li class="h">Biggest improvements</li>
      {#each changes.slice(0, 6) as c}
        <li>
          <span>{c.name}</span>
          <b class:good={c.a < c.b}>{fmt(c.b)} → {fmt(c.a)}</b>
        </li>
      {/each}
    </ol>
  </div>
</div>

<style>
  .rm { padding: clamp(14px, 2.5vw, 22px); }
  .top { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-bottom: 12px; }
  .hint { font-size: 13.5px; color: var(--muted); }
  .grid { display: grid; grid-template-columns: 1fr 260px; gap: 16px; }
  .map { position: relative; height: clamp(360px, 55vh, 520px); border-radius: 10px; overflow: hidden; }
  .legend { position: absolute; left: 10px; bottom: 10px; z-index: 2; background: rgba(255, 255, 255, 0.94); border-radius: 10px; padding: 7px 11px; display: grid; grid-template-columns: auto 110px auto; gap: 8px; align-items: center; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0, 39, 76, 0.15); }
  .legend i { height: 8px; border-radius: 4px; }
  .legend em { grid-column: 1 / -1; font-style: normal; font-weight: 400; color: var(--muted); }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; align-content: start; }
  .list .h { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-weight: 700; padding: 0 4px 6px; }
  .list li:not(.h) { display: flex; justify-content: space-between; gap: 10px; padding: 9px 10px; border-radius: 8px; background: #f6f4ec; font-size: 14px; }
  .list b { font-variant-numeric: tabular-nums; font-size: 13px; }
  .list b.good { color: #0a6b45; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
</style>
