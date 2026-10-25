import type { Routes } from './types';

/** A route prepared for walking along it: cumulative distances in a locally-flat metric. */
export interface Track { coords: number[][]; cum: number[]; len: number; agency: string; isNew: boolean; buses: number[]; speed: number }

export function tracks(routes: Routes): Track[] {
  return routes.features.map((f, i) => {
    const c = f.geometry.coordinates;
    const k = Math.cos(((c[0]?.[1] ?? 42) * Math.PI) / 180);
    const cum = [0];
    for (let j = 1; j < c.length; j++) cum.push(cum[j - 1] + Math.hypot((c[j][0] - c[j - 1][0]) * k, c[j][1] - c[j - 1][1]));
    const trips = f.properties.trips_per_weekday ?? 40;
    const n = Math.max(1, Math.min(4, Math.round(trips / 40)));
    return {
      coords: c, cum, len: cum[cum.length - 1], agency: f.properties.agency, isNew: !!f.properties.is_new,
      // spread buses evenly along the line, with a per-route offset so they don't move in lockstep
      buses: Array.from({ length: n }, (_, b) => (b / n + i * 0.137) % 1),
      speed: 0.0006, // degrees-ish per second, roughly 25 km/h on screen at city zoom
    };
  });
}

type Line = Pick<Track, 'coords' | 'cum' | 'len'>;

/** Prepare any coordinate list for walking along it. */
export function prep(coords: number[][]): Line {
  const k = Math.cos(((coords[0]?.[1] ?? 42) * Math.PI) / 180);
  const cum = [0];
  for (let j = 1; j < coords.length; j++) cum.push(cum[j - 1] + Math.hypot((coords[j][0] - coords[j - 1][0]) * k, coords[j][1] - coords[j - 1][1]));
  return { coords, cum, len: cum[cum.length - 1] };
}

/** The part of a line from its start to fraction `f`, ending exactly at the moving point. */
export function sliceTo(t: Line, f: number): number[][] {
  const d = f * t.len;
  const out = [t.coords[0]];
  for (let i = 1; i < t.coords.length && t.cum[i] < d; i++) out.push(t.coords[i]);
  out.push(pointAt(t, f));
  return out;
}

/** Point at fraction `f` (0..1) along a track. */
export function pointAt(t: Line, f: number): number[] {
  const d = f * t.len;
  let lo = 0, hi = t.cum.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (t.cum[mid] <= d) lo = mid; else hi = mid; }
  const seg = t.cum[hi] - t.cum[lo] || 1;
  const u = (d - t.cum[lo]) / seg;
  const a = t.coords[lo], b = t.coords[hi];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

/** GeoJSON of bus positions at time `s` (seconds). */
export function busesAt(ts: Track[], s: number) {
  return {
    type: 'FeatureCollection' as const,
    features: ts.flatMap((t) =>
      t.len ? t.buses.map((b) => ({
        type: 'Feature' as const,
        properties: { agency: t.agency, is_new: t.isNew },
        geometry: { type: 'Point' as const, coordinates: pointAt(t, (b + (s * t.speed) / t.len) % 1) },
      })) : [],
    ),
  };
}

/** Moving-dash frames: stepping through these makes dashes appear to travel along the line direction. */
export const DASH_FRAMES = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

/** A small chevron pointing right (east); MapLibre rotates it along the line. */
export function chevron(size = 24): ImageData {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#ffffff';
  g.lineWidth = size / 7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(size * 0.35, size * 0.25);
  g.lineTo(size * 0.65, size * 0.5);
  g.lineTo(size * 0.35, size * 0.75);
  g.stroke();
  return g.getImageData(0, 0, size, size);
}
