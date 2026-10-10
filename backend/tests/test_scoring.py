import unittest

from backend.models import (
    BudgetStatus,
    ClimatePreference,
    DestinationDetail,
    Interest,
    TravelPreferences,
)
from backend.routers.destinations import load_destinations
from backend.services.scoring import (
    rank_destinations,
    score_budget,
    score_climate,
    score_destination,
    score_interests,
)


def synthetic_price(minimum: float, maximum: float) -> dict[str, object]:
    """Test-only sourced-shaped costs; these values are never production data."""
    return {
        "min": minimum,
        "max": maximum,
        "source_url": "https://example.com/synthetic-test-only",
        "checked_at": "2026-10-10",
    }


class ScoringTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.cities = load_destinations()
        cls.lisbon = cls.cities["lisbon"]

    def test_interest_scores_and_missing_interests(self) -> None:
        self.assertEqual(
            score_interests([Interest.FOOD, Interest.BEACHES], [Interest.FOOD]),
            50,
        )
        self.assertEqual(
            score_interests([Interest.FOOD], [Interest.CULTURE]), 0
        )
        self.assertIsNone(score_interests([], [Interest.FOOD]))

    def test_climate_bands_boundaries_and_missing_data(self) -> None:
        temps = [None] * 11 + [24]
        self.assertEqual(score_climate(ClimatePreference.WARM, 12, temps), 100)
        self.assertEqual(score_climate(ClimatePreference.MILD, 12, temps), 0)
        self.assertIsNone(score_climate(ClimatePreference.ANY, 12, temps))
        self.assertIsNone(score_climate(ClimatePreference.WARM, None, temps))
        self.assertIsNone(score_climate(ClimatePreference.WARM, 1, temps))
        self.assertEqual(
            score_climate(ClimatePreference.MILD, 1, [15] + [None] * 11), 100
        )
        self.assertEqual(
            score_climate(ClimatePreference.COLD, 1, [14.9] + [None] * 11), 100
        )

    def test_budget_range_boundaries_and_one_day_trip(self) -> None:
        city = DestinationDetail.model_validate(
            self.lisbon.model_dump()
            | {
                "lodging_per_night_usd": synthetic_price(50, 100),
                "daily_ex_lodging_usd": synthetic_price(20, 40),
            }
        )

        def evaluate(budget: float, days: int = 5):
            return score_budget(
                TravelPreferences(
                    budget_usd=budget,
                    duration_days=days,
                    budget_scope="excluding_flights",
                ),
                city,
            )

        over = evaluate(299)
        uncertain = evaluate(450)
        within = evaluate(600)
        self.assertEqual(over.budget_status, BudgetStatus.OVER)
        self.assertFalse(over.eligible)
        self.assertEqual(uncertain.affordability, 50)
        self.assertEqual(uncertain.budget_status, BudgetStatus.UNCERTAIN)
        self.assertEqual(within.affordability, 100)
        self.assertEqual((within.estimated_onsite_total_usd.min, within.estimated_onsite_total_usd.max), (300, 600))
        one_day = evaluate(30, days=1)
        self.assertEqual((one_day.estimated_onsite_total_usd.min, one_day.estimated_onsite_total_usd.max), (20, 40))

    def test_missing_costs_and_total_trip_budget_are_unverified(self) -> None:
        no_costs = score_budget(
            TravelPreferences(budget_usd=1500, duration_days=5), self.lisbon
        )
        total_trip = score_budget(
            TravelPreferences(
                budget_usd=1500,
                duration_days=5,
                budget_scope="total_trip",
            ),
            self.lisbon,
        )
        no_budget = score_budget(TravelPreferences(), self.lisbon)
        for result in (no_costs, total_trip):
            self.assertEqual(result.budget_status, BudgetStatus.UNVERIFIED)
            self.assertIsNone(result.affordability)
            self.assertTrue(result.eligible)
        self.assertEqual(no_budget.budget_status, BudgetStatus.NOT_APPLICABLE)

    def test_budget_score_is_monotonic(self) -> None:
        city = DestinationDetail.model_validate(
            self.lisbon.model_dump()
            | {
                "lodging_per_night_usd": synthetic_price(50, 100),
                "daily_ex_lodging_usd": synthetic_price(20, 40),
            }
        )
        scores = [
            score_budget(
                TravelPreferences(budget_usd=value, duration_days=5), city
            ).affordability
            for value in range(1, 701)
        ]
        self.assertEqual(scores, sorted(scores))

    def test_combined_score_skips_missing_components_and_is_deterministic(self) -> None:
        preferences = TravelPreferences(
            interests=["food"], climate="warm", travel_month=12
        )
        result = score_destination(preferences, self.lisbon)
        self.assertEqual(result.score, 60)
        self.assertEqual(result.breakdown.interests, 100)
        self.assertEqual(result.breakdown.climate, 0)
        self.assertIsNone(result.breakdown.affordability)
        self.assertEqual(result, score_destination(preferences, self.lisbon))

    def test_ranking_is_stable_and_preferences_change_scores(self) -> None:
        warm = TravelPreferences(
            interests=["beaches", "food"], climate="warm", travel_month=12
        )
        cold = TravelPreferences(
            interests=["culture"], climate="cold", travel_month=12
        )
        cities = list(self.cities.values())
        ranked = rank_destinations(warm, cities)
        reversed_ranked = rank_destinations(warm, reversed(cities))
        self.assertEqual(ranked, reversed_ranked)
        self.assertEqual(len(ranked), 12)
        self.assertNotEqual(ranked, rank_destinations(cold, cities))


if __name__ == "__main__":
    unittest.main()
