import json
import unittest
from typing import Any

from backend.main import app


async def asgi_get_or_post(path: str, body: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """Send one JSON request through the app's ASGI interface without httpx."""
    messages: list[dict[str, Any]] = []
    request_body = json.dumps(body).encode("utf-8")
    received = False

    async def receive() -> dict[str, Any]:
        nonlocal received
        if not received:
            received = True
            return {"type": "http.request", "body": request_body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        messages.append(message)

    await app(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "root_path": "",
            "headers": [(b"content-type", b"application/json")],
            "server": ("testserver", 8000),
            "client": ("testclient", 12345),
        },
        receive,
        send,
    )
    status = next(message["status"] for message in messages if message["type"] == "http.response.start")
    content = b"".join(
        message.get("body", b"")
        for message in messages
        if message["type"] == "http.response.body"
    )
    return status, json.loads(content)


class RecommendationApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_recommendations_accept_complete_preferences_and_return_results(self) -> None:
        status, body = await asgi_get_or_post(
            "/api/recommendations",
            {
                "origin_city": None,
                "budget_usd": 1500,
                "budget_scope": "excluding_flights",
                "duration_days": 5,
                "travel_month": 12,
                "interests": ["beaches", "food"],
                "climate": "warm",
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(body["results"]), 12)
        self.assertEqual(body["results"][0]["destination_id"], "bangkok")
        self.assertEqual(body["results"][0]["breakdown"]["affordability"], 100)
        self.assertEqual(body["results"][0]["budget_status"], "within")
        self.assertIn("reasons", body["results"][0])
        self.assertIn("tradeoffs", body["results"][0])

    async def test_recommendations_reject_invalid_preferences_with_422(self) -> None:
        status, body = await asgi_get_or_post(
            "/api/recommendations",
            {
                "origin_city": None,
                "budget_usd": 1500,
                "budget_scope": "excluding_flights",
                "duration_days": 5,
                "travel_month": 15,
                "interests": ["beaches"],
                "climate": "warm",
            },
        )
        self.assertEqual(status, 422)
        self.assertIn("detail", body)


if __name__ == "__main__":
    unittest.main()
