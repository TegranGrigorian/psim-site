<script lang="ts">
  import * as maplibregl from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import { onMount } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { HEAT, fmt, metricMeta, METRICS } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { busesAt, chevron, DASH_FRAMES, tracks, type Track } from '../lib/routeAnim';
  import type { Bundle, CityIndex, MetricKey } from '../lib/types';

  let { bundle, base, city, hasRedesign }: { bundle: Bundle; base: Bundle; city: CityIndex; hasRedesign: boolean } = $props();

  // The inlined worker breaks under the production bundler; serve it as its own asset.
  maplibregl.setWorkerUrl(workerUrl);

  // Free vector basemap built on OpenStreetMap, no API key needed.
  const BASEMAP = 'https://tiles.openfreemap.org/styles/positron';
  const AGENCY: Record<string, string> = { theride: '#00274C', umich: '#E0A800', metro: '#00274C' };
  const NEW_ROUTE = '#D86018';
  const lineColor: any = ['case', ['boolean', ['get', 'is_new'], false], NEW_ROUTE, ['match', ['get', 'agency'], 'umich', AGENCY.umich, AGENCY.theride]];

  let el: HTMLDivElement;
  let map: maplibregl.Map | undefined;
  let ready = $state(false);
  let markers: maplibregl.Marker[] = [];
  let selected = $state<string | null>(null);
  let showRoutes = $state(true);
  let tip = $state<{ x: number; y: number; name: string; trips?: number; isNew: boolean } | null>(null);
  let ts: Track[] = [];

  // one colour scale for baseline and redesign, so switching scenarios shows real change
  const vals = $derived([bundle, base].flatMap((b) => b.hoods.features.map((f) => f.properties.metrics[app.metric].mean)));
  const lo = $derived(Math.min(...vals));
  const hi = $derived(Math.max(...vals));
  const meta = $derived(metricMeta(app.metric));

  const sel = $derived(bundle.hoods.features.find((f) => f.properties.neighborhood === selected)?.properties);
  const ranked = $derived(
    [...bundle.hoods.features].sort((a, b) => b.properties.metrics[app.metric].mean - a.properties.metrics[app.metric].mean),
  );

  const fillExpr = (a: number, b: number): any => {
    const span = b - a || 1;
    return ['interpolate', ['linear'], ['get', 'v'], ...HEAT.flatMap((c, i) => [a + (span * i) / (HEAT.length - 1), c])];
  };

  function dataFor(b: Bundle, m: MetricKey) {
    return {
      ...b.hoods,
      features: b.hoods.features.map((f, i) => ({ ...f, id: i, properties: { ...f.properties, metrics: undefined, v: f.properties.metrics[m].mean } })),
    } as any;
  }

  function buildMarkers() {
    markers.forEach((k) => k.remove());
    markers = bundle.hoods.features.map((f) => {
      const ring = f.geometry.coordinates[0];
      const c = [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length] as [number, number];
      const d = document.createElement('div');
      d.className = 'hood-label';
      d.textContent = f.properties.name;
      return new maplibregl.Marker({ element: d }).setLngLat(c).addTo(map!);
    });
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: el,
      style: BASEMAP,
      bounds: city.bbox,
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    let raf = 0, visible = false, frame = 0, lastDash = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const m = map!;
      if (now - lastDash > 60) {
        frame = (frame + 1) % DASH_FRAMES.length;
        m.setPaintProperty('route-flow', 'line-dasharray', DASH_FRAMES[frame]);
        lastDash = now;
      }
      (m.getSource('buses') as maplibregl.GeoJSONSource | undefined)?.setData(busesAt(ts, (now - t0) / 1000) as any);
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reducedMotion();
      cancelAnimationFrame(raf);
      if (visible && ready) raf = requestAnimationFrame(loop);
    });
    io.observe(el);

    map.on('load', () => {
      const m = map!;
      // our layers go under the basemap's labels so street names stay readable
      const firstLabel = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      m.addImage('chevron', chevron(), { pixelRatio: 2 });
      ts = tracks(bundle.routes);

      m.addSource('hoods', { type: 'geojson', data: dataFor(bundle, app.metric) });
      m.addSource('routes', { type: 'geojson', data: bundle.routes as any });
      m.addSource('buses', { type: 'geojson', data: busesAt(ts, 0) as any });

      m.addLayer({ id: 'hood-fill', type: 'fill', source: 'hoods', paint: { 'fill-color': fillExpr(lo, hi), 'fill-opacity': ['case', ['boolean', ['feature-state', 'on'], false], 0.7, 0.5], 'fill-color-transition': { duration: 600 } } }, firstLabel);
      m.addLayer({ id: 'hood-line', type: 'line', source: 'hoods', paint: { 'line-color': '#ffffff', 'line-width': ['case', ['boolean', ['feature-state', 'on'], false], 3, 1.2] } }, firstLabel);
      // zoom must stay at the top of the expression, so each layer gets its own scaled copy
      const trips = ['min', 160, ['coalesce', ['get', 'trips_per_weekday'], 40]];
      const width = (k = 1, add = 0): any => ['interpolate', ['linear'], ['zoom'],
        11, ['+', add, ['*', k, ['+', 1.5, ['/', trips, 60]]]],
        15, ['+', add, ['*', k, ['+', 4, ['/', trips, 25]]]]];
      m.addLayer({ id: 'route-case', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': width(1, 3) } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': lineColor, 'line-width': width() } });
      m.addLayer({ id: 'route-flow', type: 'line', source: 'routes', layout: { 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-opacity': 0.55, 'line-width': width(0.45), 'line-dasharray': DASH_FRAMES[0] } });
      m.addLayer({ id: 'route-arrows', type: 'symbol', source: 'routes', layout: { 'symbol-placement': 'line', 'symbol-spacing': 110, 'icon-image': 'chevron', 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 15, 1], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true } });
      m.addLayer({ id: 'bus-halo', type: 'circle', source: 'buses', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 15, 11], 'circle-color': '#ffffff', 'circle-opacity': 0.9, 'circle-blur': 0.3 } });
      m.addLayer({ id: 'bus-dot', type: 'circle', source: 'buses', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 15, 7], 'circle-color': ['case', ['boolean', ['get', 'is_new'], false], NEW_ROUTE, ['match', ['get', 'agency'], 'umich', AGENCY.umich, AGENCY.theride]], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } });

      buildMarkers();

      let hover: number | null = null;
      const setOn = (id: number | null, on: boolean) => id !== null && m.setFeatureState({ source: 'hoods', id }, { on });
      m.on('mousemove', 'hood-fill', (e: any) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (f && f.id !== hover) { setOn(hover, false); hover = f.id as number; setOn(hover, true); }
      });
      m.on('mouseleave', 'hood-fill', () => { setOn(hover, false); hover = null; m.getCanvas().style.cursor = ''; });
      m.on('click', 'hood-fill', (e: any) => { selected = e.features?.[0]?.properties?.neighborhood ?? null; });
      m.on('mousemove', 'route-line', (e: any) => {
        const p = e.features?.[0]?.properties;
        if (p) tip = { x: e.point.x, y: e.point.y, name: `${p.route_id.replace(/^(AA|UM|MM)-/, '')} · ${p.route_short_name}`, trips: p.trips_per_weekday, isNew: p.is_new === true || p.is_new === 'true' };
      });
      m.on('mouseleave', 'route-line', () => (tip = null));
      ready = true;
      if (visible) raf = requestAnimationFrame(loop);
    });
    return () => { cancelAnimationFrame(raf); io.disconnect(); map?.remove(); };
  });

  // metric/scenario/city changes
  $effect(() => {
    if (!ready || !map) return;
    (map.getSource('hoods') as maplibregl.GeoJSONSource).setData(dataFor(bundle, app.metric));
    (map.getSource('routes') as maplibregl.GeoJSONSource).setData(bundle.routes as any);
    ts = tracks(bundle.routes);
    map.setPaintProperty('hood-fill', 'fill-color', fillExpr(lo, hi));
  });
  $effect(() => {
    city.slug;
    if (!ready || !map) return;
    selected = null;
    buildMarkers();
    map.fitBounds(city.bbox, { padding: 24, duration: 900 });
  });
  $effect(() => {
    if (!ready || !map) return;
    const v = showRoutes ? 'visible' : 'none';
    for (const id of ['route-case', 'route-line', 'route-flow', 'route-arrows', 'bus-halo', 'bus-dot']) map.setLayoutProperty(id, 'visibility', v);
  });

  const gradient = `linear-gradient(90deg, ${HEAT.join(', ')})`;
  const newRoutes = $derived(bundle.routes.features.filter((f) => f.properties.is_new));
  const agencies = $derived([...new Set(bundle.routes.features.map((f) => f.properties.agency))]);
  const AGENCY_NAME: Record<string, string> = { theride: 'TheRide', umich: 'U-M buses', metro: 'Metro Transit' };
</script>

<div class="wrapper">
  <div class="controls">
    <div class="seg" role="group" aria-label="Metric">
      {#each METRICS.slice(0, 4) as m}
        <button aria-pressed={app.metric === m.key} onclick={() => (app.metric = m.key)}>{m.short}</button>
      {/each}
    </div>
    {#if hasRedesign}
      <div class="seg" role="group" aria-label="Scenario">
        <button aria-pressed={app.scenario === 'baseline'} onclick={() => (app.scenario = 'baseline')}>Current network</button>
        <button aria-pressed={app.scenario === 'redesign_v1'} onclick={() => (app.scenario = 'redesign_v1')}>Redesign v1</button>
      </div>
    {/if}
    <label class="toggle"><input type="checkbox" bind:checked={showRoutes} /> Routes</label>
  </div>

  <div class="grid">
    <div class="mapbox card">
      <div class="map" bind:this={el}></div>
      <div class="legend">
        <span>{fmt(app.metric, lo)}</span>
        <i style="background:{gradient}"></i>
        <span>{fmt(app.metric, hi)}</span>
        <em>{meta.short} by neighborhood</em>
      </div>
      <div class="rkey">
        {#each agencies as a}<span><i style="background:{AGENCY[a] ?? AGENCY.theride}"></i>{AGENCY_NAME[a] ?? a}</span>{/each}
        {#if newRoutes.length}<span class="new"><i style="background:{NEW_ROUTE}"></i>New in redesign</span>{/if}
        <span class="dir">› direction of travel</span>
      </div>
      {#if tip}
        <div class="tip" style="left:{tip.x}px; top:{tip.y}px">
          <b>{tip.name}</b>{#if tip.isNew}<em>new</em>{/if}
          {#if tip.trips}<small>{tip.trips} trips each weekday</small>{/if}
        </div>
      {/if}
    </div>

    <aside class="panel card">
      {#if sel}
        <h3>{sel.name}</h3>
        <p class="note">About {Math.round(sel.n_personas_mean)} of 1,000 personas live here.</p>
        <dl>
          {#each METRICS.slice(0, 4) as m}
            <div class:active={m.key === app.metric}>
              <dt>{m.short}</dt>
              <dd>{fmt(m.key, sel.metrics[m.key].mean)} <small>({fmt(m.key, sel.metrics[m.key].ci_low, false)}–{fmt(m.key, sel.metrics[m.key].ci_high, false)})</small></dd>
            </div>
          {/each}
        </dl>
        <button class="clear" onclick={() => (selected = null)}>Clear selection</button>
      {:else}
        <h3>Ranked, worst first</h3>
        <p class="note">Select a neighborhood on the map, or from this list.</p>
        <ol>
          {#each ranked as f, i (f.properties.neighborhood)}
            <li>
              <button onclick={() => (selected = f.properties.neighborhood)}>
                <span class="rk">{i + 1}</span>
                <span class="nm">{f.properties.name}</span>
                <span class="v">{fmt(app.metric, f.properties.metrics[app.metric].mean)}</span>
              </button>
            </li>
          {/each}
        </ol>
      {/if}
    </aside>
  </div>
</div>

<style>
  :global(.hood-label) { pointer-events: none; font-size: 11.5px; font-weight: 600; color: var(--blue); text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 5px #fff; white-space: nowrap; }
  .controls { display: flex; gap: 12px 18px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
  .toggle { font-size: 14px; display: inline-flex; gap: 8px; align-items: center; cursor: pointer; accent-color: var(--blue); }
  .grid { display: grid; grid-template-columns: 1fr 320px; gap: 18px; }
  .mapbox { position: relative; overflow: hidden; min-height: 520px; }
  .map { position: absolute; inset: 0; }
  .legend { position: absolute; left: 12px; bottom: 12px; background: rgba(255, 255, 255, 0.94); border-radius: 10px; padding: 8px 12px; display: grid; grid-template-columns: auto 120px auto; gap: 8px; align-items: center; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0, 39, 76, 0.15); z-index: 2; }
  .legend i { height: 8px; border-radius: 4px; }
  .legend em { grid-column: 1 / -1; font-style: normal; font-weight: 400; color: var(--muted); }
  .rkey { position: absolute; left: 12px; top: 12px; z-index: 2; display: flex; flex-wrap: wrap; gap: 4px 12px; max-width: calc(100% - 70px); background: rgba(255, 255, 255, 0.94); border-radius: 10px; padding: 7px 12px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0, 39, 76, 0.15); }
  .rkey i { display: inline-block; width: 16px; height: 4px; border-radius: 2px; margin-right: 6px; vertical-align: 3px; }
  .rkey .new { animation: in 0.5s var(--ease); }
  .rkey .dir { color: var(--muted); font-weight: 500; }
  .tip { position: absolute; z-index: 3; transform: translate(12px, -110%); background: var(--blue); color: #fff; padding: 7px 10px; border-radius: 8px; font-size: 12.5px; pointer-events: none; display: grid; box-shadow: 0 6px 18px rgba(0, 39, 76, 0.3); white-space: nowrap; }
  .tip em { font-style: normal; background: #d86018; border-radius: 4px; padding: 0 5px; font-size: 10.5px; margin-left: 6px; justify-self: start; }
  .tip small { color: #b9c9db; }
  @keyframes in { from { opacity: 0; transform: translateY(-6px); } }

  .panel { padding: 22px; align-self: stretch; max-height: 640px; overflow: auto; }
  .panel h3 { font-size: 24px; margin-bottom: 6px; }
  ol { list-style: none; margin: 14px 0 0; padding: 0; }
  ol button { width: 100%; display: grid; grid-template-columns: 24px 1fr auto; gap: 8px; text-align: left; padding: 9px 8px; border: 0; background: none; border-radius: 8px; transition: background 0.2s; }
  ol button:hover { background: #f3f0e6; }
  .rk { color: var(--muted); font-size: 13px; }
  .v { font-weight: 600; font-variant-numeric: tabular-nums; }
  dl { margin: 18px 0; display: grid; gap: 2px; }
  dl div { display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 8px; gap: 12px; }
  dl .active { background: var(--maize-soft); }
  dt { color: var(--muted); font-size: 14px; }
  dd { margin: 0; font-weight: 600; text-align: right; }
  dd small { font-weight: 400; color: var(--muted); display: block; font-size: 12px; }
  .clear { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 14px; }

  @media (max-width: 860px) {
    .grid { grid-template-columns: 1fr; }
    .mapbox { min-height: 62vh; }
    .panel { max-height: none; }
  }
</style>
