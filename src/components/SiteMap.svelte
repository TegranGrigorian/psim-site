<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import { onMount } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { HEAT, fmt, metricMeta, METRICS, label } from '../lib/format';
  import type { Bundle, CityIndex, MetricKey } from '../lib/types';

  let { bundle, city, hasRedesign }: { bundle: Bundle; city: CityIndex; hasRedesign: boolean } = $props();

  let el: HTMLDivElement;
  let map: maplibregl.Map | undefined;
  let ready = $state(false);
  let selected = $state<string | null>(null);
  let showRoutes = $state(true);

  const vals = $derived(bundle.hoods.features.map((f) => f.properties.metrics[app.metric].mean));
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

  onMount(() => {
    map = new maplibregl.Map({
      container: el,
      bounds: city.bbox,
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
      cooperativeGestures: true,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          base: { type: 'raster', tileSize: 256, attribution: '© OpenStreetMap, © CARTO', tiles: ['https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'] },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#eeebe0' } },
          { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.55 } },
        ],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const m = map!;
      m.addSource('hoods', { type: 'geojson', data: dataFor(bundle, app.metric) });
      m.addSource('routes', { type: 'geojson', data: bundle.routes as any });
      m.addLayer({ id: 'hood-fill', type: 'fill', source: 'hoods', paint: { 'fill-color': fillExpr(lo, hi), 'fill-opacity': ['case', ['boolean', ['feature-state', 'on'], false], 0.92, 0.78], 'fill-color-transition': { duration: 600 } } });
      m.addLayer({ id: 'hood-line', type: 'line', source: 'hoods', paint: { 'line-color': '#ffffff', 'line-width': ['case', ['boolean', ['feature-state', 'on'], false], 3, 1.2] } });
      m.addLayer({ id: 'route-case', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#00274C', 'line-width': ['+', 2.5, ['/', ['coalesce', ['get', 'trips_per_weekday'], 30], 40]], 'line-opacity': 0.9 } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', ['boolean', ['get', 'is_new'], false], '#FF7A2F', '#FFCB05'], 'line-width': ['/', ['coalesce', ['get', 'trips_per_weekday'], 30], 60] } });
      m.addLayer({ id: 'hood-label', type: 'symbol', source: 'hoods', layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': 12, 'text-allow-overlap': false }, paint: { 'text-color': '#00274C', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 } });

      let hover: number | null = null;
      const setOn = (id: number | null, on: boolean) => id !== null && m.setFeatureState({ source: 'hoods', id }, { on });
      m.on('mousemove', 'hood-fill', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (f && f.id !== hover) { setOn(hover, false); hover = f.id as number; setOn(hover, true); }
      });
      m.on('mouseleave', 'hood-fill', () => { setOn(hover, false); hover = null; m.getCanvas().style.cursor = ''; });
      m.on('click', 'hood-fill', (e) => { selected = e.features?.[0]?.properties?.neighborhood ?? null; });
      ready = true;
    });
    return () => map?.remove();
  });

  // metric/scenario/city changes
  $effect(() => {
    if (!ready || !map) return;
    (map.getSource('hoods') as maplibregl.GeoJSONSource).setData(dataFor(bundle, app.metric));
    (map.getSource('routes') as maplibregl.GeoJSONSource).setData(bundle.routes as any);
    map.setPaintProperty('hood-fill', 'fill-color', fillExpr(lo, hi));
  });
  $effect(() => {
    city.slug;
    if (!ready || !map) return;
    selected = null;
    map.fitBounds(city.bbox, { padding: 24, duration: 900 });
  });
  $effect(() => {
    if (!ready || !map) return;
    const v = showRoutes ? 'visible' : 'none';
    map.setLayoutProperty('route-case', 'visibility', v);
    map.setLayoutProperty('route-line', 'visibility', v);
  });

  const gradient = `linear-gradient(90deg, ${HEAT.join(', ')})`;
  const newRoutes = $derived(bundle.routes.features.filter((f) => f.properties.is_new));
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
      {#if newRoutes.length}
        <div class="newtag"><i></i> New routes in redesign</div>
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
  .controls { display: flex; gap: 12px 18px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
  .toggle { font-size: 14px; display: inline-flex; gap: 8px; align-items: center; cursor: pointer; accent-color: var(--blue); }
  .grid { display: grid; grid-template-columns: 1fr 320px; gap: 18px; }
  .mapbox { position: relative; overflow: hidden; min-height: 520px; }
  .map { position: absolute; inset: 0; }
  .legend { position: absolute; left: 12px; bottom: 12px; background: rgba(255, 255, 255, 0.94); border-radius: 10px; padding: 8px 12px; display: grid; grid-template-columns: auto 120px auto; gap: 8px; align-items: center; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0, 39, 76, 0.15); z-index: 2; }
  .legend i { height: 8px; border-radius: 4px; }
  .legend em { grid-column: 1 / -1; font-style: normal; font-weight: 400; color: var(--muted); }
  .newtag { position: absolute; left: 12px; top: 12px; background: #fff; border-radius: 999px; font-size: 12px; font-weight: 600; padding: 5px 12px 5px 10px; display: flex; gap: 8px; align-items: center; box-shadow: 0 2px 10px rgba(0, 39, 76, 0.15); z-index: 2; animation: in 0.5s var(--ease); }
  .newtag i { width: 18px; height: 4px; border-radius: 2px; background: #ff7a2f; }
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
