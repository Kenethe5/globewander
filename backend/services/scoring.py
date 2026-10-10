"""Deterministic scoring from validated preferences and curated city data."""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from backend.models import (
    BudgetScope,
    BudgetStatus,
    ClimatePreference,
    DestinationDetail,
    Interest,
    OnsiteCostRange,
    Recommendation,
    ScoreBreakdown,
    TravelPreferences,
)


def score_interests(
    requested_interests: Iterable[Interest],
    destination_tags: Iterable[Interest],
) -> float | None:
    """Return the percentage of unique requested interests present in city tags.

    All requested interests have equal weight. Duplicate interests or tags do
    not change the score. No requested interests means this component is
    unavailable (None); requested interests with no matches score zero.
    """
    requested = set(requested_interests)
    if not requested:
        return None

    matched = requested.intersection(destination_tags)
    return 100.0 * len(matched) / len(requested)


def score_climate(
    climate: ClimatePreference,
    travel_month: int | None,
    monthly_avg_temp_c: Sequence[float | None],
) -> float | None:
    """Score a historical monthly mean using validated model inputs.

    Warm is >=24 C, mild is >=15 and <24 C, and cold is <15 C.
    A matching band scores 100; any other band scores 0. Unknown month,
    missing temperature, or no climate preference makes the component None.
    Temperatures must contain 12 entries in January-to-December order.
    These are historical averages, not forecasts or daily highs.
    """
    if climate == ClimatePreference.ANY or travel_month is None:
        return None

    temperature = monthly_avg_temp_c[travel_month - 1]
    if temperature is None:
        return None

    if climate == ClimatePreference.WARM:
        matches = temperature >= 24
    elif climate == ClimatePreference.MILD:
        matches = 15 <= temperature < 24
    else:
        matches = temperature < 15

    return 100.0 if matches else 0.0


@dataclass(frozen=True)
class BudgetEvaluation:
    """Internal budget result; not a new API response format."""

    affordability: float | None
    budget_status: BudgetStatus
    eligible: bool
    estimated_onsite_total_usd: OnsiteCostRange | None


def score_budget(
    preferences: TravelPreferences,
    destination: DestinationDetail,
) -> BudgetEvaluation:
    """Evaluate verified on-site costs, excluding airfare, deterministically.

    Requires positive budget, known duration, and both curated price ranges
    with source URLs and checked dates. Source metadata is a prerequisite,
    not automatic proof of accuracy: dataset authors must verify the sources.
    Zero budget is accepted by the input model but is not scored, per the
    contract's positive-budget requirement. Unknown costs never disqualify.

    Lodging covers max(days-1, 0) nights; daily expenses exclude lodging.
    Score 100 if budget covers the maximum, 0 if below the minimum; otherwise
    interpolate linearly. Higher budgets cannot lower affordability and
    higher cost bounds cannot improve it. Only verified over-budget cities
    become ineligible. Equal cost bounds are handled before interpolation.
    """
    budget = preferences.budget_usd
    if budget is None:
        return BudgetEvaluation(None, BudgetStatus.NOT_APPLICABLE, True, None)

    days = preferences.duration_days
    if (
        preferences.budget_scope == BudgetScope.TOTAL_TRIP
        or budget <= 0
        or days is None
    ):
        return BudgetEvaluation(None, BudgetStatus.UNVERIFIED, True, None)

    lodging = destination.lodging_per_night_usd
    daily = destination.daily_ex_lodging_usd
    if (
        lodging is None
        or daily is None
        or not lodging.source_url
        or not lodging.checked_at
        or not daily.source_url
        or not daily.checked_at
    ):
        return BudgetEvaluation(None, BudgetStatus.UNVERIFIED, True, None)

    nights = max(days - 1, 0)
    estimated = OnsiteCostRange(
        min=nights * lodging.min + days * daily.min,
        max=nights * lodging.max + days * daily.max,
    )


    if budget < estimated.min:
        return BudgetEvaluation(0.0, BudgetStatus.OVER, False, estimated)
    if budget >= estimated.max:
        return BudgetEvaluation(100.0, BudgetStatus.WITHIN, True, estimated)

    affordability = round(
        100 * (budget - estimated.min) / (estimated.max - estimated.min)
    )
    return BudgetEvaluation(
        float(max(0, min(100, affordability))),
        BudgetStatus.UNCERTAIN,
        True,
        estimated,
    )


def score_destination(
    preferences: TravelPreferences,
    destination: DestinationDetail,
) -> Recommendation:
    """Combine available components and explain one city's recommendation.

    Weights are 45% interests, 30% climate, and 25% affordability.
    Normalize over available components, including zero scores but excluding
    None. No available components means no overall score. Budget eligibility
    remains separate from suitability. Explanations use only input data.
    """
    interests = score_interests(preferences.interests, destination.tags)
    climate = score_climate(
        preferences.climate, preferences.travel_month, destination.monthly_avg_temp_c
    )
    budget = score_budget(preferences, destination)
    components = [(interests, 0.45), (climate, 0.30), (budget.affordability, 0.25)]
    available = [(value, weight) for value, weight in components if value is not None]
    score = (
        round(
            sum(value * weight for value, weight in available)
            / sum(weight for _, weight in available),
            2,
        )
        if available
        else None
    )

    reasons: list[str] = []
    tradeoffs: list[str] = []
    requested = set(preferences.interests)
    tags = set(destination.tags)
    matched = sorted(interest.value for interest in requested & tags)
    missing = sorted(interest.value for interest in requested - tags)
    if matched:
        reasons.append(f"Matches requested interests: {', '.join(matched)}.")
    if missing:
        tradeoffs.append(f"Requested interests absent from curated tags: {', '.join(missing)}.")
    if interests is None:
        tradeoffs.append("Interest scoring skipped: no interests specified.")

    month = preferences.travel_month
    if climate is not None and month is not None:
        temperature = destination.monthly_avg_temp_c[month - 1]
        explanation = (
            f"Historical mean for month {month}: {temperature:g}°C; "
            f"{'matches' if climate == 100 else 'outside'} the "
            f"{preferences.climate.value} climate band."
        )
        (reasons if climate == 100 else tradeoffs).append(explanation)
        tradeoffs.append("Historical average temperature is not a forecast for your trip.")
    elif preferences.climate == ClimatePreference.ANY:
        tradeoffs.append("Climate scoring skipped: no climate preference.")
    elif month is None:
        tradeoffs.append("Climate scoring skipped: travel month is unknown.")
    else:
        tradeoffs.append("Climate scoring skipped: historical temperature is unavailable for this month.")

    if budget.budget_status == BudgetStatus.NOT_APPLICABLE:
        tradeoffs.append("Affordability not evaluated: no budget provided.")
    elif budget.budget_status == BudgetStatus.UNVERIFIED:
        if preferences.budget_scope == BudgetScope.TOTAL_TRIP:
            tradeoffs.append("Total-trip affordability cannot be verified without flight prices.")
        elif preferences.budget_usd == 0:
            tradeoffs.append("Affordability scoring requires a positive budget.")
        elif preferences.duration_days is None:
            tradeoffs.append("Affordability cannot be verified without trip duration.")
        else:
            tradeoffs.append("Affordability cannot be verified: sourced lodging and daily expense ranges are unavailable.")
    else:
        estimated = budget.estimated_onsite_total_usd
        assert estimated is not None
        cost_description = f"Estimated on-site total: ${estimated.min:g}–${estimated.max:g}."
        if budget.budget_status == BudgetStatus.WITHIN:
            reasons.append(f"{cost_description} Maximum estimate fits the budget.")
        elif budget.budget_status == BudgetStatus.OVER:
            tradeoffs.append(f"{cost_description} Minimum estimate exceeds the budget; destination is ineligible.")
        else:
            tradeoffs.append(f"{cost_description} Budget falls within this range; actual budget fit is uncertain.")
        days = preferences.duration_days
        assert days is not None
        tradeoffs.append(f"Cost assumption: {days} days and {max(days - 1, 0)} lodging nights; daily expenses exclude lodging.")
        for label, price in [
            ("Lodging", destination.lodging_per_night_usd),
            ("Daily expenses", destination.daily_ex_lodging_usd),
        ]:
            assert price is not None
            tradeoffs.append(f"{label} source: {price.source_url} (checked {price.checked_at}); indicative estimates, not live prices.")

    tradeoffs.append("Airfare is not included or verified.")
    return Recommendation(
        destination_id=destination.id,
        score=score,
        eligible=budget.eligible,
        breakdown=ScoreBreakdown(
            interests=interests, climate=climate, affordability=budget.affordability
        ),
        budget_status=budget.budget_status,
        estimated_onsite_total_usd=budget.estimated_onsite_total_usd,
        reasons=reasons,
        tradeoffs=tradeoffs,
    )


def rank_destinations(
    preferences: TravelPreferences,
    destinations: Iterable[DestinationDetail],
) -> list[Recommendation]:
    """Score all curated cities and return a deterministic ranking.

    Eligible cities come first, with scored cities ahead of unscored cities.
    Within each eligibility group, sort known scores highest first and use
    destination ID ascending to break ties. Keep ineligible and unscored
    cities in the response so their tradeoffs remain visible. A zero score
    is a known score, not a missing component. Input order is unchanged.
    """
    results = [score_destination(preferences, city) for city in destinations]
    return sorted(
        results,
        key=lambda result: (
            not result.eligible,
            result.score is None,
            -result.score if result.score is not None else 0.0,
            result.destination_id,
        ),
    )
