# Shared API Contract (LOCK BEFORE CODING)

Owners: Engineer 2 maintains backend Pydantic types; Engineer 3 maintains matching frontend TypeScript interfaces. All engineers reference this document. Make API changes via a short team review.

Base URL in development: `http://localhost:8000`. Prefix: `/api`.

## 1. Types

```ts
export type Interest = "food" | "culture" | "beaches" | "nature" | "nightlife" | "adventure";
export type ClimatePreference = "warm" | "mild" | "cold" | "any";
export type BudgetScope = "excluding_flights" | "total_trip";

export interface TravelPreferences {
  origin_city: string | null;  // optional, for eventual trip context; NO airfare inference
  budget_usd: number | null;
  budget_scope: BudgetScope;
  duration_days: number | null; // 1..30
  travel_month: number | null;  // 1..12; null = unknown
  interests: Interest[];
  climate: ClimatePreference;
}

export interface PriceRange {
  min: number;
  max: number;
  source_url: string | null;
  checked_at: string | null; // YYYY-MM-DD
}

export interface DestinationSummary {
  id: string;             // "lisbon"
  name: string;           // "Lisbon"
  country: string;        // "Portugal"
  country_code: string;   // "PRT" ISO alpha-3
  lat: number;
  lng: number;
  tags: Interest[];
  image_url: string | null;
}

export interface DestinationDetail extends DestinationSummary {
  highlights: string[];
  monthly_avg_temp_c: (number | null)[]; // exactly 12 entries, Jan..Dec
  lodging_per_night_usd: PriceRange | null;
  daily_ex_lodging_usd: PriceRange | null; // food, local transport, activities
  climate_source_url: string | null;
  climate_checked_at: string | null;
  cost_note: string | null;
}

export type BudgetStatus =
  "within" | "uncertain" | "over" | "unverified" | "not_applicable";

export interface Recommendation {
  destination_id: string;
  score: number | null; // 0..100; null means no valid components
  eligible: boolean;    // false only for verified failed hard constraints
  breakdown: {
    interests: number | null;
    climate: number | null;
    affordability: number | null;
  };
  budget_status: BudgetStatus;
  estimated_onsite_total_usd: { min: number; max: number } | null;
  reasons: string[];
  tradeoffs: string[];
}
```

## 2. Endpoints

### `GET /api/health`

`200 {"status":"ok"}`

### `GET /api/destinations`

`200 {"destinations": DestinationSummary[]}` — return only curated, supported cities. Stable IDs and coordinates. Frontend loads once at app startup.

### `GET /api/destinations/{id}`

`200 DestinationDetail`; `404 {"detail":"Destination not found"}`. Used by detail drawer; never require AI to supply factual details.

### `POST /api/preferences/parse`

Request:

```json
{
  "text": "Five days in December, $1500 excluding flights, beaches and warm weather",
  "current_preferences": {
    "origin_city": null,
    "budget_usd": null,
    "budget_scope": "excluding_flights",
    "duration_days": null,
    "travel_month": null,
    "interests": [],
    "climate": "any"
  }
}
```

Response (`200`):

```json
{
  "preferences": {
    "origin_city": null,
    "budget_usd": 1500,
    "budget_scope": "excluding_flights",
    "duration_days": 5,
    "travel_month": 12,
    "interests": ["beaches"],
    "climate": "warm"
  },
  "extracted_fields": ["budget_usd", "budget_scope", "duration_days", "travel_month", "interests", "climate"],
  "warnings": []
}
```

**Parsing rules:** Start from `current_preferences`, update only fields explicitly provided, and validate against Pydantic enums/ranges. Do not invent departure city or trip month. If the text states the budget *includes flights*, set `budget_scope="total_trip"` and return a warning that budget fit cannot be verified without airfare. On timeout, return a helpful `503`, or a clearly marked demo fallback in the frontend; don't silently invent parsed data.

### `POST /api/recommendations`

Request: the **complete** `TravelPreferences` object (not wrapped in `preferences`).

Response (`200`):

```json
{
  "results": [
    {
      "destination_id": "lisbon",
      "score": 86,
      "eligible": true,
      "breakdown": {"interests": 92, "climate": 80, "affordability": null},
      "budget_status": "unverified",
      "estimated_onsite_total_usd": null,
      "reasons": ["Matches food and culture interests"],
      "tradeoffs": ["Airfare is not included or verified"]
    }
  ]
}
```

**Important:** The sample result above is development-only, not a live recommendation or verified price. The backend sorts eligible scored cities first, then optionally shows over-budget and unscored cities separately/muted. No Gemini call on this endpoint.

## 3. Recommendation algorithm requirements

Input = validated preferences + curated city dataset.

- `interests`: calculate matched/weighted interest suitability on 0–100. Document exactly how tags become scores. With no interests, return `null`, not 100.
- `climate`: use monthly historical average (when `travel_month` exists). Convert temperature to 0–100 preference suitability using **explicit documented ranges**; when month unspecified or preferred climate=`any`, return `null`.
- `affordability`: only for `budget_scope="excluding_flights"` with real, sourced on-site cost ranges and positive budget/duration.
- **Cost range math:** `nights = max(duration_days-1, 0)`; `estimated_min = nights*lodging.min + duration_days*daily.min`, `estimated_max = nights*lodging.max + duration_days*daily.max`. Here `daily` explicitly excludes lodging.
- If estimated minimum exceeds budget, set `eligible=false`, `budget_status="over"`. If maximum is within budget, `budget_status="within"`; if budget falls in between, `"uncertain"`. If unavailable or all-in-flight scope, `"unverified"`; if no budget, `"not_applicable"`.
- For a scored affordability component, implement **and test** monotonic behavior: increasing budget never decreases affordability, and increasing estimated cost never improves it. A valid simple rule: `100` if max <= budget, `0` if min > budget, otherwise `round(100 * (budget-min) / (max-min))` (clamp to 0..100; handle min==max).
- Weighted sum: 45% interests, 30% climate, 25% affordability; divide by **sum of weights actually present**. If all missing, score is null.
- Report `budget_status` separately from `score`; a high match score does not prove a destination is affordable.
- No score must be derived from fictional scraped prices or unsourced claims. Until cost ranges are sourced, keep them null and skip affordability, with a visible caveat.

## 4. Globe behavior

- Country geometry uses GeoJSON `ISO_A3` or a normalized equivalent. Join to destination summaries by `country_code`.
- Supported country color = highest-scoring *eligible* supported city within that country. Uncovered countries stay gray, not red.
- City markers are independently clickable; use `destination_id`, never country as unique destination ID.
- New results recolor markers immediately; camera animates only on explicit destination selection or deliberate top-result focus.

## 5. Errors and empty states

- Invalid structured inputs: FastAPI `422` with Pydantic validation details.
- Unknown city: `404`.
- Gemini unreachable: `503` with a safe human-facing message.
- Empty query: `422` or frontend required-field validation.
- No eligible matches: return `200 {"results":[...]}` with `eligible=false` where justified; frontend explains the constraint tradeoff.
- Backend unavailable: frontend shows an error/retry affordance; dev fixtures only under an explicit `DEMO_MODE` toggle.

## 6. Fixture expectations

- `shared/mock-destinations.json` matches `GET /api/destinations`.
- `shared/mock-recommendations.json` matches `POST /api/recommendations`.
- These are **clearly marked development fixtures**. Production never labels their sample scores as actual ranking results.
