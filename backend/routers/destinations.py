import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models import DestinationDetail, DestinationSummary


class DestinationsResponse(BaseModel):
    destinations: list[DestinationSummary]


router = APIRouter(prefix="/api/destinations", tags=["destinations"])

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "destinations.json"


def load_destinations() -> dict[str, DestinationDetail]:
    records = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    if not isinstance(records, list):
        raise ValueError("Destination data must be a JSON list")

    destinations: dict[str, DestinationDetail] = {}

    for record in records:
        city = DestinationDetail.model_validate(record)

        if city.id in destinations:
            raise ValueError(f"Duplicate destination ID: {city.id}")

        destinations[city.id] = city

    return destinations


destinations = load_destinations()


@router.get("", response_model=DestinationsResponse)
def list_destinations() -> DestinationsResponse:
    summaries = [
        DestinationSummary.model_validate(city.model_dump())
        for city in destinations.values()
    ]
    return DestinationsResponse(destinations=summaries)


@router.get("/{destination_id}", response_model=DestinationDetail)
def get_destination(destination_id: str) -> DestinationDetail:
    city = destinations.get(destination_id)

    if city is None:
        raise HTTPException(status_code=404, detail="Destination not found")

    return city