// Compact input locations written by scripts/sync-data.mjs (rows sharing a location are merged).
export interface Inputs {
  version: 2;
  /** Share of each persona group, from the city's config.json; null if not available. */
  group_shares: Record<string, number> | null;
  /** [lon, lat, units open to students (dorm or rent), units open to everyone else (not dorm), neighborhood slug] */
  homes: [number, number, number, number, string][];
  /** [lon, lat, all jobs, standard-day non-university jobs, shift jobs, university jobs, name or ''] */
  work: [number, number, number, number, number, number, string][];
  /** [lon, lat, size weight (building footprint, m²), name or ''] */
  campus: [number, number, number, string][];
}
