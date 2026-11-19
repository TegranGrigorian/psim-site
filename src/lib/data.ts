import type { Comparison, Core, Geo, Index } from './types';

const base = `${import.meta.env.BASE_URL}data`;

// Each file is fetched at most once per page, however many components ask for it.
const cache = new Map<string, Promise<unknown>>();
function get<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${base}/${path}`).then((res) => {
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      return res.json() as Promise<T>;
    });
    p.catch(() => cache.delete(path)); // allow a retry after a failure
    cache.set(path, p);
  }
  return p;
}

export const loadIndex = () => get<Index>('index.json');

/** True if the index lists this city and scenario. */
export const hasScenario = (idx: Index | undefined, city: string, scenario: string) =>
  !!idx?.cities.find((c) => c.slug === city)?.scenarios.includes(scenario);

export async function loadCore(city: string, scenario: string): Promise<Core> {
  const dir = `${city}/${scenario}`;
  const [groupMetrics, tod] = await Promise.all([get<Core['groupMetrics']>(`${dir}/group_metrics.json`), get<Core['tod']>(`${dir}/time_of_day.json`)]);
  return { groupMetrics, tod };
}

export async function loadGeo(city: string, scenario: string): Promise<Geo> {
  const dir = `${city}/${scenario}`;
  const [hoods, routes] = await Promise.all([get<Geo['hoods']>(`${dir}/neighborhood_map.geojson`), get<Geo['routes']>(`${dir}/routes.geojson`)]);
  return { hoods, routes };
}

export async function loadComparison(city: string, scenario: string): Promise<Comparison | null> {
  try {
    return await get<Comparison>(`${city}/${scenario}/comparison.json`);
  } catch {
    return null;
  }
}

export const loadInputs = <T>(city: string) => get<T>(`${city}/inputs.json`);
