import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services import gemini_service

client = TestClient(app)


@pytest.mark.parametrize('text,patch,status', [
    ('Five days in December, $1500 excluding flights, beaches and warm weather', {'duration_days': 5, 'travel_month': 12, 'budget_usd': 1500, 'budget_scope': 'excluding_flights', 'interests': ['beaches'], 'climate': 'warm'}, 200),
    ('I love culinary trips', {'interests': ['food']}, 200),
    ('History and sightseeing', {'interests': ['culture']}, 200),
    ('Outdoor adventures', {'interests': ['nature', 'adventure']}, 200),
    ('Nightclubs', {'interests': ['nightlife']}, 200),
    ('Make it cold', {'climate': 'cold'}, 200),
    ('$2000 including flights', {'budget_usd': 2000, 'budget_scope': 'total_trip'}, 200),
    ('I am not sure when', {}, 200),
    ('Departing from Boston', {'origin_city': 'Boston'}, 200),
    ('Forty days', {'duration_days': 40}, 503),
])
def test_provider_response_validation_and_partial_merge(monkeypatch, text: str, patch: dict, status: int) -> None:
    """Mock provider output, not evidence of live model extraction accuracy."""
    original_client = httpx.AsyncClient
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.headers['x-goog-api-key'] == 'test-key'
        payload = json.loads(request.content)
        assert text in payload['contents'][0]['parts'][0]['text']
        assert payload['generationConfig']['responseFormat']['text']['mimeType'] == 'application/json'
        return httpx.Response(200, json={'candidates': [{'content': {'parts': [{'text': json.dumps(patch)}]}}]})
    monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
    monkeypatch.setattr(gemini_service.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    current = {'origin_city': None, 'travel_month': None, 'budget_usd': 1500, 'duration_days': 5, 'climate': 'any', 'interests': [], 'budget_scope': 'excluding_flights'}
    response = client.post('/api/preferences/parse', json={'text': text, 'current_preferences': current})
    assert response.status_code == status
    assert 'test-key' not in response.text
    if status == 200:
        result = response.json()
        assert result['preferences'] == current | patch
        assert result['extracted_fields'] == list(patch)
        if patch.get('budget_scope') == 'total_trip':
            assert result['warnings']


def test_missing_key_and_blank_input(monkeypatch) -> None:
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    assert client.post('/api/preferences/parse', json={'text': 'food', 'current_preferences': {}}).status_code == 503
    assert client.post('/api/preferences/parse', json={'text': ' ', 'current_preferences': {}}).status_code == 422
    assert client.post('/api/recommendations', json={'interests': ['food']}).status_code == 200


@pytest.mark.parametrize('failure', ['timeout', 'malformed', 'http'])
def test_provider_failures_are_safe(monkeypatch, failure: str) -> None:
    original_client = httpx.AsyncClient
    def respond(request: httpx.Request) -> httpx.Response:
        if failure == 'timeout':
            raise httpx.ReadTimeout('sensitive provider info', request=request)
        return httpx.Response(500 if failure == 'http' else 200, json={'sensitive': 'provider info'})
    monkeypatch.setenv('GEMINI_API_KEY', 'private-test-key')
    monkeypatch.setattr(gemini_service.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    response = client.post('/api/preferences/parse', json={'text': 'warm', 'current_preferences': {}})
    assert response.status_code == 503
    assert 'sensitive' not in response.text and 'private-test-key' not in response.text
