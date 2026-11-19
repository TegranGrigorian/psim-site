// Mirrors SCHEMA.md §5. Keep in sync with the contract, not with the fake generator.
export type MetricKey =
  | 'total_minutes'
  | 'wait_minutes'
  | 'in_vehicle_minutes'
  | 'walk_minutes'
  | 'transfers'
  | 'failure_rate';

/** Extra metrics (SCHEMA.md §5.1): null when a group has no data, e.g. before the delay model has run. */
export type ExtraKey = 'required_failure_rate' | 'on_time_rate' | 'delay_buffer_minutes' | 'planned_minutes' | 'allow_minutes';

export interface Interval { mean: number; ci_low: number; ci_high: number }
/** A metric with no data in any replicate is left out of the file or set to null, never filled with zero. */
export type Metrics = Partial<Record<MetricKey | ExtraKey, Interval | null>>;

export type Dimension = 'group' | 'tenure' | 'neighborhood' | 'shift_pattern' | 'age_band' | 'income_band';

export interface GroupEntry {
  dimension: Dimension;
  value: string;
  n_personas_mean: number;
  metrics: Metrics;
}
export interface GroupMetrics {
  schema_version: string;
  fake?: boolean;
  city_slug: string;
  scenario: string;
  n_replicates: number;
  groups: GroupEntry[];
}

export interface TodHour {
  hour: number;
  failure_rate: number;
  mean_wait: number;
  /** 0 means no trips at this hour: the zeros above are "no data", not "no failures". */
  n_trips?: number;
  n_wait_samples?: number;
}
export interface TodSeries {
  group: string;
  day_type: 'weekday' | 'weekend';
  hours: TodHour[];
}
export interface TimeOfDay { series: TodSeries[] }

export interface HoodFeature {
  type: 'Feature';
  properties: { neighborhood: string; name: string; n_personas_mean: number; metrics: Metrics };
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}
export interface NeighborhoodMap { type: 'FeatureCollection'; outline_note?: string; features: HoodFeature[] }

export interface RouteFeature {
  type: 'Feature';
  properties: { route_id: string; route_short_name: string; agency: string; trips_per_weekday?: number; is_new?: boolean };
  geometry: { type: 'LineString'; coordinates: number[][] };
}
export interface Routes { type: 'FeatureCollection'; features: RouteFeature[] }

export interface Delta { before: number; after: number; delta: number; ci_low: number; ci_high: number }
export interface Comparison {
  from_scenario: string;
  to_scenario: string;
  n_paired_replicates?: number;
  groups: {
    dimension: Dimension;
    value: string;
    deltas: Partial<Record<MetricKey, Delta | null>>;
  }[];
}

export interface CityIndex { slug: string; display_name: string; bbox: [number, number, number, number]; scenarios: string[] }
export interface Index { fake?: boolean; cities: CityIndex[] }

/** The small files most charts need: loaded first. */
export interface Core {
  groupMetrics: GroupMetrics;
  tod: TimeOfDay;
}
/** The map files (routes.geojson is the largest summary file): loaded only when a map needs them. */
export interface Geo {
  hoods: NeighborhoodMap;
  routes: Routes;
}
export type Bundle = Core & Geo;

/** data/<city>/meta.json, written by sync-data.mjs from the city's config and baseline replicates. */
export interface CityMeta { population_size: number | null; seeds: [number, number] | null; on_time_share: number | null }

/** A scenario's description (data/<city>/<scenario>.json) plus weekday trips per changed route. */
export interface ScenarioSpec {
  description?: string;
  target_tract?: string;
  feeds?: Record<string, { op: string; route: string | number; until?: string; from?: string; to?: string; factor?: number }[]>;
  routes?: { route: string; trips_before: number | null; trips_after: number | null }[];
}

/** data/report/hypotheses.json, written by `psim-engine report`. */
export interface ReportTest { test: string; metric: string; difference: string; replicates: string; verdict: string }
export interface ReportEntry { id: string; city: string; claim: string; verdict: string; tests: ReportTest[] }
export interface Report { verdict_rule: string; n_replicates: Record<string, number>; preliminary?: boolean; hypotheses: ReportEntry[] }
