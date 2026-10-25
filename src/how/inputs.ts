export interface Inputs {
  housing: { housing_id: string; lat: number; lon: number; tenure: string; units: number; neighborhood: string }[];
  workplaces: { workplace_id: string; lat: number; lon: number; name: string; jobs: number; shift_pattern: string; is_university: boolean | string }[];
  campus: { campus_id: string; lat: number; lon: number; name: string; capacity_weight: number }[];
}
