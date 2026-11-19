// Copies summary files from ../data into public/data so the static build can fetch them.
// The site only reads summaries (SCHEMA.md §5), never raw results.
// Only the cities and scenarios listed in summaries_index.json are copied: stale files left on
// disk by older runs (or the fake-data generator) never reach the site.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'data');
const dst = join(here, '..', 'public', 'data');

if (!existsSync(join(src, 'summaries_index.json'))) {
  console.error('data/summaries_index.json missing. Run `npm run fake-data` or `psim-tools analyze`.');
  process.exit(1);
}
const index = JSON.parse(readFileSync(join(src, 'summaries_index.json'), 'utf8'));
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(join(src, 'summaries_index.json'), join(dst, 'index.json'));

// Minimal CSV reader: the input tables (SCHEMA.md §2) have no quoted fields.
function csv(path) {
  if (!existsSync(path)) return [];
  const [head, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const keys = head.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], isNaN(+v) || v === '' ? v : +v])));
}
const r5 = (v) => Math.round(v * 1e5) / 1e5;

// Input locations, used only by step 2 of the How it works page to illustrate sampling.
// The raw tables are thousands of rows with columns the page never uses, so rows that share a
// location are merged and only the weights the page samples with are kept (see src/how/inputs.ts).
function inputs(dir) {
  const housing = csv(join(dir, 'housing.csv'));
  if (!housing.length) return null;
  const homes = new Map();
  for (const h of housing) {
    const k = `${h.lon},${h.lat},${h.neighborhood}`;
    const row = homes.get(k) ?? homes.set(k, [r5(h.lon), r5(h.lat), 0, 0, String(h.neighborhood)]).get(k);
    // students live in dorms or rentals; everyone else anywhere but a dorm (same rule as Places.svelte)
    if (h.tenure === 'dorm' || h.tenure === 'rent') row[2] += h.units;
    if (h.tenure !== 'dorm') row[3] += h.units;
  }
  const work = new Map();
  for (const w of csv(join(dir, 'workplaces.csv'))) {
    const k = `${w.lon},${w.lat}`;
    const row = work.get(k) ?? work.set(k, [r5(w.lon), r5(w.lat), 0, 0, 0, 0, '']).get(k);
    const uni = w.is_university === true || w.is_university === 'true';
    row[2] += w.jobs;
    if (!uni && w.shift_pattern === 'standard_day') row[3] += w.jobs;
    if (w.shift_pattern !== 'standard_day') row[4] += w.jobs;
    if (uni) row[5] += w.jobs;
    if (!row[6] && w.name) row[6] = String(w.name);
  }
  const campus = csv(join(dir, 'campus_locations.csv')).map((c) => [r5(c.lon), r5(c.lat), c.capacity_weight, String(c.name ?? '')]);
  let shares = null;
  try { shares = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')).group_shares ?? null; } catch { /* no config */ }
  return {
    version: 2,
    group_shares: shares,
    // [lon, lat, units open to students, units open to everyone else, neighborhood]
    homes: [...homes.values()].filter((h) => h[2] + h[3] > 0),
    // [lon, lat, all jobs, standard-day non-university jobs, shift jobs, university jobs, name]
    work: [...work.values()].filter((w) => w[2] > 0),
    // [lon, lat, weight, name]
    campus: campus.filter((c) => c[2] > 0),
  };
}

for (const city of index.cities ?? []) {
  const sums = join(src, city.slug, 'summaries');
  for (const scenario of city.scenarios ?? []) {
    const from = join(sums, scenario);
    if (!existsSync(from)) { console.warn(`index lists ${city.slug}/${scenario} but ${from} is missing`); continue; }
    cpSync(from, join(dst, city.slug, scenario), { recursive: true });
  }
  const inp = inputs(join(src, city.slug));
  if (inp) {
    mkdirSync(join(dst, city.slug), { recursive: true });
    writeFileSync(join(dst, city.slug, 'inputs.json'), JSON.stringify(inp));
  }
}
console.log('synced summaries ->', dst);
