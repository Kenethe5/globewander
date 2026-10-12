import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.main import app
from backend.models import DestinationDetail, TravelPreferences
from backend.routers.destinations import load_destinations
from backend.services.scoring import score_budget, score_destination

client = TestClient(app)


@pytest.mark.parametrize('patch', [
    {'duration_days': 0}, {'duration_days': 31}, {'duration_days': 1.5},
    {'travel_month': 0}, {'travel_month': 13}, {'climate': 'hot'},
    {'interests': ['shopping']}, {'budget_usd': -1},
    {'preferences': {'interests': ['food']}},
])
def test_invalid_preferences(patch: dict) -> None:
    assert client.post('/api/recommendations', json=patch).status_code == 422


def test_catalog_health_missing_city_and_cors() -> None:
    assert client.get('/api/health').json() == {'status': 'ok'}
    cities = client.get('/api/destinations').json()['destinations']
    assert 12 <= len(cities) <= 15
    assert len({city['id'] for city in cities}) == len(cities)
    assert client.get('/api/destinations/unknown').status_code == 404
    for city in cities:
        DestinationDetail.model_validate(client.get('/api/destinations/' + city['id']).json())
    allowed = client.options('/api/recommendations', headers={
        'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    })
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'
    assert 'access-control-allow-origin' not in client.get('/api/health', headers={'Origin': 'https://unknown.example'}).headers


def test_missing_components_and_climate_month_changes() -> None:
    city = load_destinations()['kyoto']
    assert score_destination(TravelPreferences(), city).score is None
    summer = score_destination(TravelPreferences(climate='warm', travel_month=8), city)
    winter = score_destination(TravelPreferences(climate='warm', travel_month=1), city)
    assert summer.score > winter.score
    with pytest.raises(ValidationError):
        TravelPreferences(budget_usd=float('inf'))


def test_cost_monotonicity_equal_ranges_and_unsourced_costs() -> None:
    city = load_destinations()['lisbon']
    preference = TravelPreferences(budget_usd=450, duration_days=5)
    def priced(low: float, high: float, sourced: bool = True) -> DestinationDetail:
        price = {'min': low, 'max': high, 'source_url': 'https://example.com/test' if sourced else None, 'checked_at': '2026-10-11'}
        return DestinationDetail.model_validate(city.model_dump() | {'lodging_per_night_usd': price, 'daily_ex_lodging_usd': price})
    scores = [score_budget(preference, priced(value, value + 30)).affordability for value in range(10, 100)]
    assert scores == sorted(scores, reverse=True)
    assert score_budget(preference, priced(50, 50)).affordability == 100
    assert score_budget(preference, priced(51, 51)).eligible is False
    assert score_budget(preference, priced(10, 20, False)).affordability is None


def test_dataset_source_conversion_and_metadata() -> None:
    records = json.loads((Path(__file__).parents[1] / 'data/destinations.json').read_text())
    for record in records:
        metadata = record['_provenance']
        assert metadata['highlight_source_urls']
        assert record['climate_source_url'] and record['climate_checked_at']
        if metadata['source_temperature_unit'] == 'F':
            expected = [round((value - 32) * 5 / 9) for value in metadata['source_monthly_mean_temperatures']]
            assert record['monthly_avg_temp_c'] == expected


def test_sourced_cost_derivation_and_live_budget_effect() -> None:
    sources = json.loads((Path(__file__).parents[1] / 'data/cost-sources.json').read_text())
    cities = load_destinations()
    for city_id, source in sources.items():
        city = cities[city_id]
        assert city.lodging_per_night_usd.source_url == source['source_url']
        assert city.lodging_per_night_usd.min == 2 * source['accommodation_per_person_double_occupancy'][0]
        assert city.lodging_per_night_usd.max == 2 * source['accommodation_per_person_double_occupancy'][1]
        expected = [round(sum(source[key][i] for key in ('food', 'local_transport', 'entertainment')), 2) for i in (0, 1)]
        assert [city.daily_ex_lodging_usd.min, city.daily_ex_lodging_usd.max] == expected
        low = score_budget(TravelPreferences(budget_usd=1, duration_days=5), city)
        high = score_budget(TravelPreferences(budget_usd=10000, duration_days=5), city)
        assert not low.eligible and high.eligible
        assert low.affordability < high.affordability
