import type { Bundle, Comparison, Index } from './types';

const base = `${import.meta.env.BASE_URL}data`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadIndex(): Promise<Index> {
  return get<Index>('index.json');
}

export async function loadBundle(city: string, scenario: string): Promise<Bundle> {
  const dir = `${city}/${scenario}`;
  const [groupMetrics, tod, hoods, routes] = await Promise.all([
    get<Bundle['groupMetrics']>(`${dir}/group_metrics.json`),
    get<Bundle['tod']>(`${dir}/time_of_day.json`),
    get<Bundle['hoods']>(`${dir}/neighborhood_map.geojson`),
    get<Bundle['routes']>(`${dir}/routes.geojson`),
  ]);
  return { groupMetrics, tod, hoods, routes };
}

export async function loadComparison(city: string, scenario: string): Promise<Comparison | null> {
  try {
    return await get<Comparison>(`${city}/${scenario}/comparison.json`);
  } catch {
    return null;
  }
}
