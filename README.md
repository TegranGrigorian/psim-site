# psim-site

Static site for *Who Is the Bus For?* (Svelte 5, Vite, TypeScript, MapLibre GL). It reads only the summary files described in `docs/SCHEMA.md` §5, never raw results.

```
npm install
npm run fake-data   # writes FAKE summaries into ../data (every file flagged "fake": true)
npm run dev         # copies ../data summaries to public/data, then starts Vite
npm run build       # static output in dist/ (relative base, works on GitHub Pages)
```

## Route shapes

Route lines on the map come from the real TheRide and U-M GTFS feeds (shapes and weekday trip counts). `scripts/shapes/ann_arbor_routes.geojson` is cached in the repo; to refresh it, download and unzip both feeds and run:

```
node scripts/gtfs-routes.mjs ann_arbor theride=<unzipped theride gtfs> umich=<unzipped umich gtfs>
npm run fake-data
```

- TheRide: https://www.theride.org/sites/default/files/google/google_transit.zip
- U-M: https://webapps.fo.umich.edu/transit_uploads/google_transit.zip

The basemap is OpenFreeMap (OpenStreetMap data), no API key needed.

## Data it expects

`../data/summaries_index.json` plus, per city and scenario, `../data/<city>/summaries/<scenario>/{group_metrics.json, time_of_day.json, neighborhood_map.geojson, routes.geojson}` and optionally `redesign_v1/comparison.json`.

`summaries_index.json` is new (not yet in SCHEMA.md): `{ "fake"?: bool, "cities": [{ "slug", "display_name", "bbox", "scenarios": [] }] }`. `time_of_day.json` and `comparison.json` shapes are also defined by `scripts/make-fake-data.mjs` and `src/lib/types.ts`, so reconcile them with `psim-tools analyze`. Once real output exists, delete the fake files and drop `"fake": true`; the preview banner goes away.
