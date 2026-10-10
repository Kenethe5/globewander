from fastapi import APIRouter

from backend.models import RecommendationResponse, TravelPreferences
from backend.routers.destinations import destinations
from backend.services.scoring import rank_destinations


router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse)
def get_recommendations(preferences: TravelPreferences) -> RecommendationResponse:
    """Rank the curated cities for one complete, validated preference set."""
    results = rank_destinations(preferences, destinations.values())
    return RecommendationResponse(results=results)
