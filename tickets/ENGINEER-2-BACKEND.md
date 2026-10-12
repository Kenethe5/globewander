# Engineer 2 — FastAPI, Curated Destinations, and Ranking Engine

Completion implementation: existing Engineer 2 source was retained, canonical validation/CORS/setup were hardened and scoring/API/data checks expanded. See [completion handoff](../docs/COMPLETION-HANDOFF.md) for files, tests and limitations. Costs/photos remain null; no synthetic test costs enter production.

**Mission:** Make travel recommendations deterministic and explainable. You own request validation, destination data, ranking, and correctness tests. **Gemini never sets recommendation scores.**

**Before starting:** Read [`../README.md`](../README.md), [`../AGENTS.md`](../AGENTS.md), and [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md).

## My assigned ticket checklist

- [x] **BE-01** — API foundation and Pydantic schemas
- [x] **BE-02** — Curated city dataset + destination endpoints
- [x] **BE-03** — Deterministic ranking engine
- [x] **BE-04** — Recommendation API and tests
- [x] **BE-05** — Final source and operational hardening

Keep this checklist synchronized with [`../TASKS.md`](../TASKS.md). Each ticket below includes implementation detail, dependencies, and a done condition.

**Primary files you own**

```text
backend/main.py
backend/models.py
backend/routers/destinations.py
backend/routers/recommendations.py
backend/services/scoring.py
backend/data/destinations.json
backend/tests/test_scoring.py
backend/tests/test_api.py
```

Engineer 3 owns Gemini and its preference parser route. You register that route in `main.py` when it is ready; avoid editing their service implementation.

## Ticket BE-01 — API foundation and Pydantic schemas [P0; ~2h]

**Tasks**
- Create `FastAPI` app with CORS for approved local/deployed frontend domains; no wildcard in production.
- Add `/api/health` returning `{"status":"ok"}`.
- Define models matching `docs/API-CONTRACT.md`: `TravelPreferences`, `DestinationSummary`, `DestinationDetail`, `Recommendation`, `RecommendationResponse`, `PriceRange`, enums.
- Add field validation: `duration_days` 1–30 or null, `travel_month` 1–12 or null, nonnegative/positive budget, 3-letter country codes, sorted ranges `min <= max`.
- Put API routes behind `/api`; health test via curl.

**Done when:** server starts, `/docs` shows schemas, invalid types return 422, and no field names differ from the contract.

## Ticket BE-02 — Curated city dataset + destination endpoints [P0; ~4h, parallel with BE-01]

**Tasks**
- Create **12–15 real cities** with unique slug IDs, correct lat/lng, country, ISO alpha-3 codes, a small set of tags, and two to four verified highlights each.
- For each city add 12 monthly typical temperatures **where historical climate data is available**; use null for missing months.
- Add on-site cost *ranges* only if you have a citable public source URL and retrieval date. Do not invent prices to make budget filtering look exciting. Make the data contract tolerant of missing prices.
- Define price fields so nightly lodging and daily expenses are separate (no double counting).
- Create `GET /api/destinations` and `GET /api/destinations/{id}` from in-memory loaded JSON.
- Ensure source/metadata and image use terms permitting your demo's use. Bundle local country geometry on frontend, not in the API.

**Done when:** endpoints return consistent IDs; unknown city is 404; dataset loader validates every record; city entries have geographically diverse interest profiles.

## Ticket BE-03 — Deterministic ranking engine [P0; ~5h, after models; use fixtures initially]

**Tasks**
- Implement pure functions `score_interests`, `score_climate`, `score_budget`, `score_destination`, `rank_destinations` in `services/scoring.py`.
- Interest match: assign scores based on requested tags and fixed editorial tag mapping; publish the rule in code comments. No interests specified means no interest component.
- Climate match: compare average monthly temperature against documented bands, e.g. warm ≥24 °C, mild 15–23.9 °C, cold <15 °C. Score by proximity rather than hard 0/100 if time permits. Unknown month or preference `any` → null climate component.
- Budget: estimate on-site expense interval = `(days - 1) * lodging_per_night + days * daily_ex_lodging` for 1–30 days. For excluding-flights budget only. If min > budget, mark over-budget and ineligible; if max <= budget, “within”; if interval straddles budget, “uncertain”. If flight-inclusive or missing range → “unverified”.
- Score available components using `0.45*interests + 0.30*climate + 0.25*affordability`, divided by sum of present weights. Null component is omitted—not treated as zero.
- Produce reasons and tradeoffs from actual structured input data. Make score/tie order deterministic.
- Return 0–100 (or null if no components) plus component breakdown and budget status; never auto-discard unscored cities without explaining.

**Done when:** warm/beach and cold/nature queries yield meaningfully different scores; larger budget cannot lower budget score; missing costs never appear as $0 or as "affordable".

## Ticket BE-04 — Recommendation API and tests [P0; ~3h, after BE-03]

**Tasks**
- Implement `POST /api/recommendations` taking `TravelPreferences` directly and returning `{"results": [...]}`.
- Add `pytest` parameterized tests for: climate month differences; empty interest list; unknown month; budget range boundary; missing cost; all-in budget scope; duration 1 day; budget increased; validation errors; stable sorting.
- Confirm that this endpoint neither imports nor calls Gemini.
- Use `httpx`/FastAPI TestClient for one endpoint integration test.

**Done when:** tests pass and changing only the budget or tags returns updated rankings rapidly with no third-party network calls.

## Ticket BE-05 — Final source and operational hardening [P1; ~2–3h]

**Tasks**
- Store source URLs and retrieval dates for cost and climate values.
- Return a cost warning when hotel/airfare prices are unknown or stale; do not call data a forecast unless it is one.
- If no prices are verified by demo time, leave cost fields null and keep score focused on known interests/climate. Explicitly tell Engineer 3 to adjust the demo to emphasize interest/climate What If?, not pretend budget changes scores.
- Add basic CORS, request validation and readable failures. Review response times locally.

**Done when:** a skeptical judge can tell which information is sourced, estimated, or unavailable; no false price precision.

## Handoff to Engineer 1 and 3

- Share valid **mock** responses early, then one backend URL with stable endpoints.
- Inform Engineer 1 when the first `GET /api/destinations` payload is stable.
- Inform Engineer 3 when `POST /api/recommendations` passes tests.
- Engineer 3 creates `backend/routers/preferences.py`; integrate it with `app.include_router(...)` without rewriting its code.

## Commands / smoke tests

```bash
cd backend
uvicorn main:app --reload --port 8000
pytest -q
curl http://localhost:8000/api/health
curl http://localhost:8000/api/destinations
```

Recommended test command for ranked response:

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{"origin_city":null,"budget_usd":1500,"budget_scope":"excluding_flights","duration_days":5,"travel_month":12,"interests":["beaches","food"],"climate":"warm"}'
```
