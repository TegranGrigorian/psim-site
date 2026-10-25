// Turns unzipped GTFS feeds into one small route GeoJSON per city (scripts/shapes/<city>_routes.geojson).
// Shapes and weekday trip counts are real; the fake data generator reuses them for routes.geojson.
// Usage: node scripts/gtfs-routes.mjs ann_arbor theride=/path/to/theride_gtfs umich=/path/to/umich_gtfs
// Trip counts are for one in-term weekday (DATE below), honouring calendar_dates exceptions.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATE = '20261027'; // a Tuesday during fall term
const [city, ...feeds] = process.argv.slice(2);
const BBOX = { ann_arbor: [-83.80, 42.22, -83.66, 42.34], madison: [-89.52, 43.02, -89.28, 43.15] }[city];
if (!BBOX || !feeds.length) { console.error('usage: gtfs-routes.mjs ann_arbor agency=dir ...'); process.exit(1); }

/** CSV with quoted fields (GTFS headsigns and descriptions contain commas). */
function csv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

const inBox = ([x, y]) => x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3];
const d2 = (a, b) => ((a[0] - b[0]) * 0.74) ** 2 + (a[1] - b[1]) ** 2;
const title = (s) => s.toLowerCase().replace(/(^|[\s\-–(/])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()).replace(/\bU-m\b/g, 'U-M');

const features = [];
for (const arg of feeds) {
  const [agency, dir] = arg.split('=');
  const routes = csv(join(dir, 'routes.txt'));
  const trips = csv(join(dir, 'trips.txt'));
  const tuesday = new Set(csv(join(dir, 'calendar.txt')).filter((c) => c.tuesday === '1' && c.start_date <= DATE && c.end_date >= DATE).map((c) => c.service_id));
  try {
    for (const e of csv(join(dir, 'calendar_dates.txt')).filter((e) => e.date === DATE)) {
      if (e.exception_type === '1') tuesday.add(e.service_id); else tuesday.delete(e.service_id);
    }
  } catch { /* calendar_dates.txt is optional */ }
  const shapes = new Map();
  for (const p of csv(join(dir, 'shapes.txt'))) {
    if (!shapes.has(p.shape_id)) shapes.set(p.shape_id, []);
    shapes.get(p.shape_id).push([+p.shape_pt_sequence, +(+p.shape_pt_lon).toFixed(5), +(+p.shape_pt_lat).toFixed(5)]);
  }
  for (const r of routes) {
    const rt = trips.filter((t) => t.route_id === r.route_id && tuesday.has(t.service_id));
    if (!rt.length) continue;
    // the shape most trips use is the route's normal pattern
    const count = new Map();
    for (const t of rt) count.set(t.shape_id, (count.get(t.shape_id) ?? 0) + 1);
    const shapeId = [...count].sort((a, b) => b[1] - a[1])[0][0];
    const pts = (shapes.get(shapeId) ?? []).sort((a, b) => a[0] - b[0]).map(([, x, y]) => [x, y]);
    if (pts.length < 2 || pts.filter(inBox).length / pts.length < 0.4) continue;
    // drop points closer than ~20 m to the last kept one
    const line = [pts[0]];
    for (let i = 1; i < pts.length; i++) if (i === pts.length - 1 || d2(pts[i], line[line.length - 1]) > 4e-8) line.push(pts[i]);
    features.push({
      type: 'Feature',
      properties: { ref: r.route_short_name, name: title(r.route_long_name), agency, trips_per_weekday: rt.length },
      geometry: { type: 'LineString', coordinates: line },
    });
  }
}
const out = join(dirname(fileURLToPath(import.meta.url)), 'shapes', `${city}_routes.geojson`);
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', source: `GTFS: ${feeds.map((f) => f.split('=')[0]).join(', ')}`, features }));
console.log(features.length, 'routes,', features.reduce((a, f) => a + f.geometry.coordinates.length, 0), 'points ->', out);
for (const f of features) console.log(' ', f.properties.agency, f.properties.ref, f.properties.name, f.properties.trips_per_weekday);
