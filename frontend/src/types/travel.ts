export type Interest = 'food' | 'culture' | 'beaches' | 'nature' | 'nightlife' | 'adventure';
export type ClimatePreference = 'warm' | 'mild' | 'cold' | 'any';
export type BudgetScope = 'excluding_flights' | 'total_trip';
export interface TravelPreferences {
  origin_city: string | null;
  budget_usd: number | null;
  budget_scope: BudgetScope;
  duration_days: number | null;
  travel_month: number | null;
  interests: Interest[];
  climate: ClimatePreference;
}
export interface PriceRange {
  min: number;
  max: number;
  source_url: string | null;
  checked_at: string | null;
}
export interface DestinationSummary {
  id: string;
  name: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  tags: Interest[];
  image_url: string | null;
}
export interface DestinationDetail extends DestinationSummary {
  highlights: string[];
  monthly_avg_temp_c: (number | null)[];
  lodging_per_night_usd: PriceRange | null;
  daily_ex_lodging_usd: PriceRange | null;
  climate_source_url: string | null;
  climate_checked_at: string | null;
  cost_note: string | null;
}
export type BudgetStatus = 'within' | 'uncertain' | 'over' | 'unverified' | 'not_applicable';
export interface Recommendation {
  destination_id: string;
  score: number | null;
  eligible: boolean;
  breakdown: { interests: number | null; climate: number | null; affordability: number | null };
  budget_status: BudgetStatus;
  estimated_onsite_total_usd: { min: number; max: number } | null;
  reasons: string[];
  tradeoffs: string[];
}
export interface DestinationsResponse { destinations: DestinationSummary[] }
export interface RecommendationsResponse { results: Recommendation[] }
export interface ParsePreferencesRequest { text: string; current_preferences: TravelPreferences }
export interface ParsePreferencesResponse {
  preferences: TravelPreferences;
  extracted_fields: (keyof TravelPreferences)[];
  warnings: string[];
}
export const defaultPreferences: TravelPreferences = {
  origin_city: null, budget_usd: null, budget_scope: 'excluding_flights',
  duration_days: null, travel_month: null, interests: [], climate: 'any',
};
