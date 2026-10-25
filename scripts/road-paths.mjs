// One-off: road paths from every home to every destination in data/<city>/ inputs, so the
// How page can draw people moving along real streets. Uses the public OSRM demo server
// (OpenStreetMap data), politely: one request per second. Output is cached in public/how/.
// Usage: node scripts/road-paths.mjs ann_arbor
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const city = process.argv[2] ?? 'ann_arbor';
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', '..', 'data', city);
const out = join(here, '..', 'public', 'how', `${city}_paths.json`);

function csv(path) {
  const [head, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const keys = head.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], v])));
}
const homes = csv(join(dataDir, 'housing.csv')).map((h) => ({ id: h.housing_id, lon: +h.lon, lat: +h.lat }));
const dests = [
  ...csv(join(dataDir, 'workplaces.csv')).map((w) => ({ id: w.workplace_id, lon: +w.lon, lat: +w.lat })),
  ...csv(join(dataDir, 'campus_locations.csv')).map((c) => ({ id: c.campus_id, lon: +c.lon, lat: +c.lat })),
];

const paths = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d2 = (a, b) => ((a[0] - b[0]) * 0.74) ** 2 + (a[1] - b[1]) ** 2;

let n = 0;
for (const h of homes) for (const d of dests) {
  const key = `${h.id}>${d.id}`;
  if (paths[key]) continue;
  const url = `https://router.project-osrm.org/route/v1/driving/${h.lon},${h.lat};${d.lon},${d.lat}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'psim-site/0.1 (class project)' }, signal: AbortSignal.timeout(30_000) });
      const j = await res.json();
      if (j.code !== 'Ok') throw new Error(j.code);
      const pts = j.routes[0].geometry.coordinates.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
      // keep a point every ~25 m; plenty for an animation
      const line = [pts[0]];
      for (let i = 1; i < pts.length; i++) if (i === pts.length - 1 || d2(pts[i], line[line.length - 1]) > 6e-8) line.push(pts[i]);
      paths[key] = { m: Math.round(j.routes[0].distance), c: line };
      break;
    } catch (e) {
      console.warn(key, 'retry', e.message);
      await sleep(3000 * (attempt + 1));
    }
  }
  if (++n % 20 === 0) { writeFileSync(out, JSON.stringify(paths)); console.log(n, 'paths'); }
  await sleep(1100);
}
writeFileSync(out, JSON.stringify(paths));
console.log('done:', Object.keys(paths).length, 'paths ->', out);
