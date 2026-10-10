"""Deterministic scoring from validated preferences and curated city data."""

from collections.abc import Iterable

from backend.models import Interest


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
