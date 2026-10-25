# psim-site

Static site for *Who Is the Bus For?* (Svelte 5, Vite, TypeScript, MapLibre GL). It reads only the summary files described in `docs/SCHEMA.md` §5, never raw results.

```
npm install
npm run fake-data   # writes FAKE summaries into ../data (every file flagged "fake": true)
npm run dev         # copies ../data summaries to public/data, then starts Vite
npm run build       # static output in dist/ (relative base, works on GitHub Pages)
```

## Data it expects

`../data/summaries_index.json` plus, per city and scenario, `../data/<city>/summaries/<scenario>/{group_metrics.json, time_of_day.json, neighborhood_map.geojson, routes.geojson}` and optionally `redesign_v1/comparison.json`.

`summaries_index.json` is new (not yet in SCHEMA.md): `{ "fake"?: bool, "cities": [{ "slug", "display_name", "bbox", "scenarios": [] }] }`. `time_of_day.json` and `comparison.json` shapes are also defined by `scripts/make-fake-data.mjs` and `src/lib/types.ts`, so reconcile them with `psim-tools analyze`. Once real output exists, delete the fake files and drop `"fake": true`; the preview banner goes away.
