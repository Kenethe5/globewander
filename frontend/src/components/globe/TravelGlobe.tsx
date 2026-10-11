import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countriesTopology from 'world-atlas/countries-110m.json';
import type { DestinationSummary, Recommendation } from '../../types/travel';
import { countryRecommendations, GLOBE_COLORS, resultById, scoreColor } from './globeColors';

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name?: string }> & { id?: string | number };
type GlobePoint = DestinationSummary & { recommendation?: Recommendation };

// World Atlas uses UN numeric country IDs. Curated city IDs use ISO alpha-3.
const ISO_BY_NUMERIC_ID: Record<string, string> = {
  '036': 'AUS', '076': 'BRA', '124': 'CAN', '214': 'DOM', '352': 'ISL',
  '356': 'IND', '392': 'JPN', '484': 'MEX', '504': 'MAR', '620': 'PRT',
  '702': 'SGP', '710': 'ZAF', '724': 'ESP', '764': 'THA', '840': 'USA',
};

const topology = countriesTopology as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = feature(topology, topology.objects.countries).features as CountryFeature[];

// Locally drawn equirectangular texture from the bundled Natural Earth geometry.
function earthTexture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.fillStyle = '#071d36'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#24475b';
  for (const country of countries) {
    const geometry = country.geometry;
    const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : geometry.type === 'Polygon' ? [geometry.coordinates] : [];
    for (const polygon of polygons) {
      context.beginPath();
      for (const ring of polygon) {
        ring.forEach(([lng, lat], index) => {
          const x = (lng + 180) / 360 * canvas.width;
          const y = (90 - lat) / 180 * canvas.height;
          if (index === 0 || Math.abs(lng - ring[index - 1][0]) > 180) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      }
      context.fill('evenodd');
    }
  }
  return canvas.toDataURL();
}

export interface TravelGlobeProps {
  destinations: DestinationSummary[];
  results: Recommendation[];
  selectedDestinationId: string | null;
  onSelectDestination: (id: string) => void;
  onCountryClick?: (countryCode: string | null, countryName: string) => void;
}

export default function TravelGlobe({ destinations, results, selectedDestinationId, onSelectDestination, onCountryClick }: TravelGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 620, height: 620 });
  const [hoveredCountry, setHoveredCountry] = useState<CountryFeature | null>(null);
  const resultMap = useMemo(() => resultById(results), [results]);
  const texture = useMemo(earthTexture, []);
  const points = useMemo<GlobePoint[]>(() => destinations.map(city => ({ ...city, recommendation: resultMap.get(city.id) })), [destinations, resultMap]);
  const countryScores = useMemo(() => countryRecommendations(destinations, results), [destinations, results]);

  useEffect(() => {
    const resize = () => {
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const next = Math.min(700, Math.max(300, bounds.width));
      setSize({ width: Math.floor(next), height: Math.floor(Math.min(650, Math.max(360, next * 0.88))) });
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const city = destinations.find(item => item.id === selectedDestinationId);
    if (city) globeRef.current?.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.5 }, 850);
  }, [destinations, selectedDestinationId]);

  const countryCode = (country: CountryFeature) => ISO_BY_NUMERIC_ID[String(country.id).padStart(3, '0')] ?? null;
  const selected = points.find(point => point.id === selectedDestinationId);
  return <div className="globe-wrap" ref={wrapperRef}>
    <label>Explore a country <select aria-label="Explore a country" defaultValue="" onChange={event => {
      const country = countries.find(item => String(item.id) === event.target.value);
      if (country) onCountryClick?.(countryCode(country), country.properties?.name ?? 'Country');
    }}><option value="" disabled>Choose a country</option>{[...countries].sort((a, b) => (a.properties?.name ?? '').localeCompare(b.properties?.name ?? '')).map(country => <option key={String(country.id)} value={String(country.id)}>{country.properties?.name}</option>)}</select></label>
    <Globe
      ref={globeRef}
      width={size.width}
      height={size.height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={texture}
      showAtmosphere
      atmosphereColor="#3f85ff"
      atmosphereAltitude={0.16}
      polygonsData={countries}
      polygonAltitude={(country: object) => country === hoveredCountry || countryCode(country as CountryFeature) === selected?.country_code ? 0.016 : 0.008}
      polygonCapColor={(country: object) => {
        const code = countryCode(country as CountryFeature);
        const score = code ? countryScores.get(code) : undefined;
        return score ? scoreColor(score.score, score.eligible) : GLOBE_COLORS.unsupported;
      }}
      polygonSideColor={() => 'rgba(18, 47, 93, 0.35)'}
      polygonStrokeColor={() => 'rgba(164, 207, 255, 0.28)'}
      polygonLabel={(country: object) => {
        const feature = country as CountryFeature;
        const code = countryCode(feature);
        const supported = code && destinations.some(city => city.country_code === code);
        return `<div class="globe-label"><strong>${feature.properties?.name ?? 'Country'}</strong><br/>${supported ? 'Curated cities available' : 'Not yet covered'}</div>`;
      }}
      onPolygonHover={(country: object | null) => setHoveredCountry(country as CountryFeature | null)}
      onPolygonClick={(country: object) => {
        const feature = country as CountryFeature;
        onCountryClick?.(countryCode(feature), feature.properties?.name ?? 'This country');
      }}
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor={(point: object) => {
        const city = point as GlobePoint;
        return city.id === selected?.id ? GLOBE_COLORS.selected : scoreColor(city.recommendation?.score ?? null, city.recommendation?.eligible ?? true);
      }}
      pointAltitude={(point: object) => (point as GlobePoint).id === selected?.id ? 0.16 : 0.075}
      pointRadius={(point: object) => (point as GlobePoint).id === selected?.id ? 0.34 : 0.22}
      pointLabel={(point: object) => {
        const city = point as GlobePoint;
        const score = city.recommendation?.score;
        return `<div class="globe-label"><strong>${city.name}</strong><br/>${score === null || score === undefined ? 'Not scored' : `${score}% match`}</div>`;
      }}
      onPointClick={(point: object) => onSelectDestination((point as GlobePoint).id)}
    />
    <div className="globe-legend" aria-label="Globe score legend">
      <span><i className="dot high" />Strong match</span><span><i className="dot mid" />Match</span><span><i className="dot gray" />Not scored</span><span><i className="dot muted" />Not yet covered</span>
    </div>
    <p className="coverage-note">Only curated cities are evaluated. Gray countries are not low scores.</p>
  </div>;
}
