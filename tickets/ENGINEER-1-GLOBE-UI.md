# Engineer 1 — 3D Globe + Destination Display

**Mission:** Own everything the judge visually explores: the Earth, city markers, country interactions, result cards, detail drawer, and camera motion. Do **not** own API requests or Gemini calls. Build with dev fixture data from day one.

**Before starting:** Read [`../README.md`](../README.md), [`../AGENTS.md`](../AGENTS.md), and [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md).

## My assigned ticket checklist

- [ ] **FE-01** — 3D globe bootstrapping
- [ ] **FE-02** — Clickable countries + city markers
- [ ] **FE-03** — Score-driven globe visualization
- [ ] **FE-04** — Results cards + details drawer
- [ ] **FE-05** — Camera, polish and interaction

Keep this checklist synchronized with [`../TASKS.md`](../TASKS.md). Each ticket below includes implementation detail, dependencies, and a done condition.

**Primary files you own**

```text
frontend/src/components/globe/TravelGlobe.tsx
frontend/src/components/globe/globeColors.ts
frontend/src/components/destination/RecommendationList.tsx
frontend/src/components/destination/DestinationDetails.tsx
frontend/src/components/AppShell.tsx
frontend/src/styles/globe.css
```

`AppShell.tsx` is a reusable layout that accepts regions/children; Engineer 3 owns root `App.tsx` and sends props. Never fetch data inside `TravelGlobe`.

## Ticket FE-01 — 3D globe bootstrapping [P0; ~2h]

**Tasks**
- Scaffold or use existing Vite + React/TS app.
- `npm install react-globe.gl three` (add appropriate type packages if needed).
- Build `<TravelGlobe />` using a textured 3D Earth, dark background, configurable width/height, mouse rotate/zoom and moderate atmosphere effect.
- Implement `resize` behavior; `globeRef` can access `pointOfView()`.
- Prevent WebGL/canvas from covering UI overlays.

**Done when:** globe renders at 1440×900, rotates/zooms smoothly, survives resize, and doesn't require the backend.

## Ticket FE-02 — Clickable countries + city markers [P0; ~3h, after FE-01]

**Tasks**
- Load simplified country GeoJSON from a local public-domain source (prefer geo-countries/Natural Earth); normalize feature country code to ISO alpha-3.
- Render `polygonsData`, `polygonCapColor`, `onPolygonClick`; visually highlight hovered/selected country.
- Render `pointsData` from `DestinationSummary` using `lat`/`lng`, `pointLabel`, `onPointClick`.
- On country click: find supported cities in that country; otherwise emit/show “Not yet covered.”
- Ensure city markers are not blocked by country polygon clicks (test event priority).

**Done when:** Portugal click yields supported Lisbon if in dataset; unsupported countries clearly say “Not yet covered”; marker selection uses city ID.

## Ticket FE-03 — Score-driven globe visualization [P0; ~3h, after FE-02]

**Component prop contract**

```ts
interface TravelGlobeProps {
  destinations: DestinationSummary[];
  results: Recommendation[];
  selectedDestinationId: string | null;
  onSelectDestination: (id: string) => void;
}
```

**Tasks**
- Join recommendations to summaries by `destination_id`; use country `ISO_A3` code for polygon joins.
- Color eligible cities by score; visually mute known over-budget results. Gray for null/unscored.
- Aggregate per country using the maximum eligible supported-city score. Keep unsupported countries neutral.
- Update marker color/size and polygon color on prop changes without rebuilding the whole 3D globe.
- Put score legend near globe, with a clear “only supported cities are evaluated” note.

**Done when:** swapping between `shared/mock-recommendations.json` and another fixture changes visual results without reload. No claim that gray countries are bad options.

## Ticket FE-04 — Results cards + details drawer [P0; ~3h, after FE-02]

**Tasks**
- `<RecommendationList results=... destinations=... onSelect=... />` sorted eligible ranked cities first.
- Show name, country, numeric suitability score or “Not scored,” 1–2 reasons, budget status (e.g. “Cost unverified”).
- `<DestinationDetails destination=... recommendation=... onClose=... />` shows highlights, sourced photo if present, typical climate month (if available), and price range only when verified.
- Show clear cost caveat: indicative on-site costs, **airfare excluded**, not hotel availability or live prices.
- Offer an external hotel-search link only as a P1 enhancement; do not fabricate booking URLs.
- Mobile responsive layout is optional but desktop usable is required.

**Done when:** clicking a card opens the correct detail panel with null-safe fallbacks; no `$0` shown for absent price data.

## Ticket FE-05 — Camera, polish and interaction [P1; ~2–3h, after FE-03/04]

**Tasks**
- Animate camera toward selected city using `pointOfView({lat,lng,altitude}, durationMs)`.
- Stop auto-rotation while the judge interacts; do not recenter camera for every slider tick.
- Show subtle transitions when city scores change, clear selected marker visual, accessible high-contrast labels.
- Optimize GeoJSON resolution and cap device pixel ratio if the judging laptop struggles.

**Done when:** changing the recommendation list updates visuals smoothly; clicking a card pans to the correct city; no distracting automatic spinning during inspection.

## Integration handoff to Engineer 3

Engineer 3 imports and renders:

```tsx
<AppShell
  sidebar={<PreferencesPanel ... />}
  globe={<TravelGlobe
    destinations={destinations}
    results={results}
    selectedDestinationId={selectedId}
    onSelectDestination={setSelectedId}
  />}
  results={<RecommendationList ... />}
  details={<DestinationDetails ... />}
/>
```

Those props are illustrative; agree on final typed layout props in a small PR. **No backend calls in your components.**

## Manual test path

1. Load globe with the dev destination fixture (no backend needed).
2. Click Portugal and a city marker.
3. Replace mocked ranking array; ensure color scale changes.
4. Select city card; verify camera centers it and details align.
5. Resize browser; make sure globe doesn't overlap controls.
