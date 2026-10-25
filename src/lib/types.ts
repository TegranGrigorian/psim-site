// Mirrors SCHEMA.md §5. Keep in sync with the contract, not with the fake generator.
export type MetricKey =
  | 'total_minutes'
  | 'wait_minutes'
  | 'in_vehicle_minutes'
  | 'walk_minutes'
  | 'transfers'
  | 'failure_rate';

export interface Interval { mean: number; ci_low: number; ci_high: number }
export type Metrics = Record<MetricKey, Interval>;

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

export interface TodSeries {
  group: string;
  day_type: 'weekday' | 'weekend';
  hours: { hour: number; failure_rate: number; mean_wait: number }[];
}
export interface TimeOfDay { series: TodSeries[] }

export interface HoodFeature {
  type: 'Feature';
  properties: { neighborhood: string; name: string; n_personas_mean: number; metrics: Metrics };
  geometry: GeoJSON.Polygon;
}
export interface NeighborhoodMap { type: 'FeatureCollection'; features: HoodFeature[] }

export interface RouteFeature {
  type: 'Feature';
  properties: { route_id: string; route_short_name: string; agency: string; trips_per_weekday?: number; is_new?: boolean };
  geometry: GeoJSON.LineString;
}
export interface Routes { type: 'FeatureCollection'; features: RouteFeature[] }

export interface Comparison {
  from_scenario: string;
  to_scenario: string;
  groups: {
    dimension: Dimension;
    value: string;
    deltas: Record<MetricKey, { before: number; after: number; delta: number; ci_low: number; ci_high: number }>;
  }[];
}

export interface CityIndex { slug: string; display_name: string; bbox: [number, number, number, number]; scenarios: string[] }
export interface Index { fake?: boolean; cities: CityIndex[] }

export interface Bundle {
  groupMetrics: GroupMetrics;
  tod: TimeOfDay;
  hoods: NeighborhoodMap;
  routes: Routes;
}
