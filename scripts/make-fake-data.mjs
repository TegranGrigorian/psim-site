// Generates FAKE summary files (SCHEMA.md §5) so the site can be built and
// tested before psim-tools analyze exists. Nothing here is a research result.
// Usage: node scripts/make-fake-data.mjs   (deterministic, seed 42)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(42);
const jitter = (s) => 1 + (r() - 0.5) * 2 * s;
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// ---------- city definitions ----------
const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
const BASE = {
  undergraduate:    [24, 5.5, 13, 6, 0.2, 0.03],
  graduate:         [29, 6.5, 16, 7, 0.35, 0.045],
  university_staff: [36, 8, 20, 8, 0.55, 0.06],
  resident_worker:  [52, 12, 24, 15, 0.95, 0.13],
  shift_worker:     [66, 17, 27, 18, 1.2, 0.26],
  retired:          [47, 11, 20, 14, 0.8, 0.15],
};
const METRICS = ['total_minutes', 'wait_minutes', 'in_vehicle_minutes', 'walk_minutes', 'transfers', 'failure_rate'];

const CITIES = {
  ann_arbor: {
    display_name: 'Ann Arbor, MI',
    bbox: [-83.80, 42.24, -83.66, 42.33],
    shares: { undergraduate: 0.2, graduate: 0.1, university_staff: 0.1, resident_worker: 0.3, shift_worker: 0.15, retired: 0.15 },
    gap: 1.0,
    hoods: {
      central_campus: ['Central Campus', 42.2745, -83.7365, 0.78],
      north_campus: ['North Campus', 42.291, -83.715, 0.85],
      kerrytown: ['Kerrytown', 42.2855, -83.7455, 0.92],
      burns_park: ['Burns Park', 42.2735, -83.7265, 0.95],
      old_west_side: ['Old West Side', 42.281, -83.756, 1.0],
      west_side: ['West Side', 42.272, -83.78, 1.22],
      south_side: ['South Side', 42.255, -83.745, 1.12],
      east_side: ['East Side', 42.279, -83.69, 1.3],
      northside: ['Northside', 42.305, -83.735, 1.28],
      northeast: ['Northeast', 42.315, -83.695, 1.45],
    },
    routes: [
      ['AA-4', 'theride', 'Washtenaw', [[-83.6700, 42.2480], [-83.7000, 42.2570], [-83.7300, 42.2690], [-83.7400, 42.2745]], 88],
      ['AA-5', 'theride', 'Packard', [[-83.6850, 42.2490], [-83.7150, 42.2600], [-83.7450, 42.2680]], 70],
      ['AA-22', 'theride', 'North Main', [[-83.7455, 42.2820], [-83.7400, 42.2980], [-83.7300, 42.3120]], 46],
      ['AA-23', 'theride', 'Miller / Maple', [[-83.7900, 42.2860], [-83.7650, 42.2830], [-83.7500, 42.2830]], 40],
      ['AA-33', 'theride', 'Plymouth', [[-83.7455, 42.2830], [-83.7250, 42.2880], [-83.7000, 42.2990], [-83.6850, 42.3150]], 44],
      ['AA-36', 'theride', 'Dexter', [[-83.7800, 42.2750], [-83.7620, 42.2780], [-83.7450, 42.2790]], 32],
      ['AA-61', 'theride', 'Briarwood Link', [[-83.7400, 42.2750], [-83.7420, 42.2600], [-83.7380, 42.2420]], 52],
      ['UM-NW', 'umich', 'Northwood', [[-83.7365, 42.2745], [-83.7250, 42.2840], [-83.7150, 42.2910]], 140],
      ['UM-BB', 'umich', 'Bursley–Baits', [[-83.7365, 42.2745], [-83.7260, 42.2880], [-83.7185, 42.2965]], 120],
      ['UM-CN', 'umich', 'Commuter North', [[-83.7650, 42.2810], [-83.7400, 42.2800], [-83.7150, 42.2910]], 64],
    ],
    newRoutes: [
      ['AA-N1', 'theride', 'Night Owl Loop (new)', [[-83.7455, 42.2830], [-83.7200, 42.2950], [-83.7000, 42.3100], [-83.6950, 42.3150]], 38],
      ['AA-E2', 'theride', 'East Side Crosstown (new)', [[-83.6900, 42.2790], [-83.7150, 42.2830], [-83.7455, 42.2840]], 56],
    ],
    // redesign effect on failure/wait by hood
    helped: { northeast: 0.62, northside: 0.74, east_side: 0.7, west_side: 0.88, south_side: 0.95 },
    nightFix: true,
  },
  madison: {
    display_name: 'Madison, WI',
    bbox: [-89.50, 43.04, -89.30, 43.12],
    shares: { undergraduate: 0.22, graduate: 0.1, university_staff: 0.1, resident_worker: 0.28, shift_worker: 0.15, retired: 0.15 },
    gap: 0.55,
    hoods: {
      campus: ['Campus', 43.0766, -89.4125, 0.8],
      downtown: ['Downtown', 43.0747, -89.384, 0.85],
      near_west: ['Near West', 43.068, -89.44, 0.95],
      near_east: ['Near East', 43.086, -89.36, 1.0],
      north_side: ['North Side', 43.1, -89.37, 1.15],
      east_side: ['East Side', 43.085, -89.31, 1.2],
      south_side: ['South Side', 43.045, -89.39, 1.12],
      southwest: ['Southwest', 43.05, -89.46, 1.18],
      far_west: ['Far West', 43.07, -89.49, 1.3],
    },
    routes: [
      ['MM-A', 'metro', 'Route A', [[-89.3100, 43.0850], [-89.3600, 43.0820], [-89.3840, 43.0747], [-89.4125, 43.0766]], 160],
      ['MM-B', 'metro', 'Route B', [[-89.4900, 43.0700], [-89.4600, 43.0720], [-89.4400, 43.0690], [-89.4125, 43.0766]], 150],
      ['MM-C', 'metro', 'Route C', [[-89.3700, 43.1000], [-89.3800, 43.0850], [-89.3840, 43.0747], [-89.3900, 43.0450]], 120],
      ['MM-D', 'metro', 'Route D', [[-89.4600, 43.0500], [-89.4300, 43.0560], [-89.4125, 43.0766]], 90],
      ['MM-E', 'metro', 'Route E', [[-89.3600, 43.0860], [-89.3840, 43.0747]], 110],
    ],
    newRoutes: [],
    helped: {},
    nightFix: false,
  },
};

// ---------- helpers ----------
function metricBlock(vals, n) {
  const out = {};
  METRICS.forEach((m, i) => {
    const mean = vals[i];
    const hw = mean * (0.04 + 6 / Math.sqrt(n)) * 0.12 * (m === 'failure_rate' ? 2.2 : 1) * jitter(0.25);
    out[m] = { mean: round(mean, m === 'failure_rate' ? 4 : 2), ci_low: round(Math.max(0, mean - hw), m === 'failure_rate' ? 4 : 2), ci_high: round(mean + hw, m === 'failure_rate' ? 4 : 2) };
  });
  return out;
}
const mix = (base, gap) => {
  const avg = GROUPS.reduce((s, g) => s + BASE[g].map((v) => v)[0], 0) / GROUPS.length;
  return base.map((v, i) => {
    const gAvg = GROUPS.reduce((s, g) => s + BASE[g][i], 0) / GROUPS.length;
    return gAvg + (v - gAvg) * gap;
  });
};
function groupVals(city, g, scen) {
  let v = mix(BASE[g], city.gap).map((x) => x * jitter(0.03));
  if (scen === 'redesign_v1' && city.nightFix) {
    const k = { shift_worker: [0.86, 0.78, 0.9, 0.97, 0.88, 0.58], resident_worker: [0.94, 0.9, 0.97, 0.98, 0.95, 0.82], retired: [0.95, 0.9, 0.97, 0.97, 0.95, 0.84], university_staff: [0.99, 0.98, 1, 1, 1, 0.97] }[g];
    if (k) v = v.map((x, i) => x * k[i]);
    else v = v.map((x, i) => x * (i === 5 ? 1.01 : 1.005));
  }
  return v;
}
function weightedAvg(city, scen, weights) {
  const tot = Object.values(weights).reduce((a, b) => a + b, 0);
  const acc = [0, 0, 0, 0, 0, 0];
  for (const [g, w] of Object.entries(weights)) groupVals(city, g, scen).forEach((x, i) => (acc[i] += (x * w) / tot));
  return acc;
}

// ---------- geometry: clipped Voronoi cells ----------
function clip(poly, [ax, ay], [bx, by]) {
  // keep points closer to a than b
  const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = bx - ax, ny = by - ay;
  const side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny; // <=0 keep
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp <= 0 !== sq <= 0) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
function voronoi(sites, bbox) {
  const [x0, y0, x1, y1] = bbox;
  return sites.map((s, i) => {
    let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    sites.forEach((t, j) => { if (i !== j && poly.length) poly = clip(poly, s, t); });
    return poly;
  });
}

// ---------- build ----------
const dayType = ['weekday', 'weekend'];
function build(slug, city, scen) {
  const N = 1000;
  const weights = city.shares;
  const groups = [];
  const push = (dimension, value, n, vals) => groups.push({ dimension, value, n_personas_mean: round(n, 1), metrics: metricBlock(vals, n) });

  GROUPS.forEach((g) => push('group', g, N * weights[g], groupVals(city, g, scen)));

  const sub = (dim, entries) => entries.forEach(([value, mixw, f]) => {
    const w = Object.fromEntries(GROUPS.map((g) => [g, (mixw[g] ?? 0.0001)]));
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    const v = weightedAvg(city, scen, w).map((x, i) => x * (i >= 4 || i === 3 ? f : f) );
    push(dim, value, N * Math.min(0.6, tot), v);
  });
  sub('tenure', [
    ['own', { resident_worker: 0.45, retired: 0.4, university_staff: 0.1, shift_worker: 0.05 }, 1.02],
    ['rent', { resident_worker: 0.3, shift_worker: 0.2, graduate: 0.2, university_staff: 0.1, undergraduate: 0.2 }, 0.97],
    ['dorm', { undergraduate: 0.9, graduate: 0.1 }, 1.0],
    ['other_group', { undergraduate: 0.5, retired: 0.3, graduate: 0.2 }, 1.0],
  ]);
  sub('shift_pattern', [
    ['standard_day', { resident_worker: 0.5, university_staff: 0.3, retired: 0.2 }, 0.97],
    ['early', { shift_worker: 0.3, resident_worker: 0.7 }, 1.1],
    ['evening', { shift_worker: 0.7, resident_worker: 0.3 }, 1.15],
    ['night', { shift_worker: 0.95, resident_worker: 0.05 }, 1.28],
    ['rotating', { shift_worker: 0.8, university_staff: 0.2 }, 1.1],
    ['student', { undergraduate: 0.65, graduate: 0.35 }, 0.95],
    ['none', { retired: 1 }, 1.0],
  ]);
  sub('age_band', [
    ['18_24', { undergraduate: 0.85, graduate: 0.1, shift_worker: 0.05 }, 0.96],
    ['25_34', { graduate: 0.5, resident_worker: 0.25, shift_worker: 0.25 }, 1.02],
    ['35_49', { resident_worker: 0.5, university_staff: 0.3, shift_worker: 0.2 }, 1.04],
    ['50_64', { resident_worker: 0.4, university_staff: 0.35, shift_worker: 0.15, retired: 0.1 }, 1.05],
    ['65_plus', { retired: 0.9, resident_worker: 0.1 }, 1.0],
  ]);
  sub('income_band', [
    ['low', { undergraduate: 0.4, shift_worker: 0.3, retired: 0.2, graduate: 0.1 }, 1.1],
    ['mid', { resident_worker: 0.4, university_staff: 0.2, graduate: 0.2, retired: 0.2 }, 1.0],
    ['high', { university_staff: 0.3, resident_worker: 0.5, retired: 0.2 }, 0.92],
  ]);

  const names = Object.keys(city.hoods);
  const hoodShare = names.map((n) => 1 / names.length * jitter(0.4));
  const hoodGroupBias = (n, g) => ({ central_campus: { undergraduate: 3, graduate: 2 }, north_campus: { undergraduate: 3, graduate: 2 }, campus: { undergraduate: 3, graduate: 2 } }[n]?.[g] ?? 1);
  const hoodVals = {};
  names.forEach((n, i) => {
    const w = Object.fromEntries(GROUPS.map((g) => [g, city.shares[g] * hoodGroupBias(n, g)]));
    let f = city.hoods[n][3];
    f = 1 + (f - 1) * city.gap * (0.9 + 0.1);
    if (scen === 'redesign_v1' && city.helped[n]) f = 1 + (f - 1) * 0.55;
    let v = weightedAvg(city, scen, w).map((x) => x * f);
    if (scen === 'redesign_v1' && city.helped[n]) v[5] *= city.helped[n];
    hoodVals[n] = v;
    push('neighborhood', n, N * hoodShare[i] / hoodShare.reduce((a, b) => a + b, 0), v);
  });

  const groupMetrics = { schema_version: '0.1', fake: true, city_slug: slug, scenario: scen, n_replicates: 100, groups };

  // time of day
  const tod = { schema_version: '0.1', fake: true, city_slug: slug, scenario: scen, day_types: dayType, series: [] };
  const hour = (h, g, dt) => {
    const [, , , , , fail] = groupVals(city, g, scen);
    let curve = 0.6;
    if (h >= 0 && h < 5) curve = 3.2; else if (h === 5) curve = 1.9; else if (h >= 6 && h < 20) curve = 0.6 + 0.3 * Math.exp(-((h - 8) ** 2) / 8) + 0.2 * Math.exp(-((h - 17) ** 2) / 8); else if (h >= 20 && h < 22) curve = 1.2; else curve = 2.2;
    if (dt === 'weekend') curve *= h < 9 ? 1.5 : 1.25;
    const nightHit = g === 'shift_worker' ? 1.5 : g === 'retired' ? 0.8 : g === 'undergraduate' ? 0.75 : 1;
    let cur = curve;
    if (scen === 'redesign_v1' && city.nightFix && (h >= 20 || h < 6)) cur *= g === 'shift_worker' ? 0.45 : 0.75;
    const failure = Math.min(0.97, (fail * cur * nightHit) * jitter(0.06));
    const wait = (BASE[g][1] * (city.gap * 0.5 + 0.5)) * (0.7 + cur * 0.55) * jitter(0.05);
    return { hour: h, failure_rate: round(failure, 4), mean_wait: round(wait, 2) };
  };
  GROUPS.forEach((g) => dayType.forEach((dt) => tod.series.push({ group: g, day_type: dt, hours: Array.from({ length: 24 }, (_, h) => hour(h, g, dt)) })));

  // neighborhoods
  const polys = voronoi(names.map((n) => [city.hoods[n][2], city.hoods[n][1]]), city.bbox);
  const nmap = {
    type: 'FeatureCollection', schema_version: '0.1', fake: true, city_slug: slug, scenario: scen,
    features: names.map((n, i) => ({
      type: 'Feature',
      properties: { neighborhood: n, name: city.hoods[n][0], n_personas_mean: groups.find((g) => g.dimension === 'neighborhood' && g.value === n).n_personas_mean, metrics: groups.find((g) => g.dimension === 'neighborhood' && g.value === n).metrics },
      geometry: { type: 'Polygon', coordinates: [[...polys[i], polys[i][0]].map(([x, y]) => [round(x, 6), round(y, 6)])] },
    })),
  };

  // routes
  const all = [...city.routes, ...(scen === 'redesign_v1' ? city.newRoutes : [])];
  const routes = {
    type: 'FeatureCollection', schema_version: '0.1', fake: true, city_slug: slug, scenario: scen,
    features: all.map(([id, agency, name, pts, trips]) => ({
      type: 'Feature',
      properties: { route_id: id, route_short_name: name, agency, trips_per_weekday: trips, is_new: city.newRoutes.some((x) => x[0] === id) },
      geometry: { type: 'LineString', coordinates: pts },
    })),
  };
  return { groupMetrics, tod, nmap, routes };
}

function write(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj));
}

const index = { schema_version: '0.1', fake: true, cities: [] };
const built = {};
for (const [slug, city] of Object.entries(CITIES)) {
  const scens = city.nightFix ? ['baseline', 'redesign_v1'] : ['baseline'];
  index.cities.push({ slug, display_name: city.display_name, bbox: city.bbox, scenarios: scens });
  for (const scen of scens) {
    const b = build(slug, city, scen);
    built[`${slug}/${scen}`] = b;
    const dir = join(ROOT, slug, 'summaries', scen);
    write(join(dir, 'group_metrics.json'), b.groupMetrics);
    write(join(dir, 'time_of_day.json'), b.tod);
    write(join(dir, 'neighborhood_map.geojson'), b.nmap);
    write(join(dir, 'routes.geojson'), b.routes);
  }
}

// comparison.json (baseline vs redesign_v1), SCHEMA §5.5
{
  const a = built['ann_arbor/baseline'].groupMetrics.groups, b = built['ann_arbor/redesign_v1'].groupMetrics.groups;
  const comp = {
    schema_version: '0.1', fake: true, city_slug: 'ann_arbor', from_scenario: 'baseline', to_scenario: 'redesign_v1',
    groups: a.map((g, i) => {
      const h = b[i];
      const deltas = {};
      METRICS.forEach((m) => {
        const d = h.metrics[m].mean - g.metrics[m].mean;
        const se = (g.metrics[m].ci_high - g.metrics[m].ci_low + h.metrics[m].ci_high - h.metrics[m].ci_low) / 4 / 1.96 * Math.SQRT2 / 1.2;
        deltas[m] = { before: g.metrics[m].mean, after: h.metrics[m].mean, delta: round(d, 4), ci_low: round(d - 1.96 * se, 4), ci_high: round(d + 1.96 * se, 4) };
      });
      return { dimension: g.dimension, value: g.value, deltas };
    }),
  };
  write(join(ROOT, 'ann_arbor', 'summaries', 'redesign_v1', 'comparison.json'), comp);
}
write(join(ROOT, 'summaries_index.json'), index);
writeFileSync(join(ROOT, 'FAKE_SUMMARIES.md'), '# FAKE summaries\n\nEvery `summaries/` folder and `summaries_index.json` under `data/` was produced by\n`psim-site/scripts/make-fake-data.mjs` so the website can be built before `psim-tools analyze` exists.\nThey are invented numbers, flagged with `"fake": true`, and are **not results**. Delete and regenerate with real output.\n');
console.log('fake data written to', ROOT);
