from fastapi import APIRouter, HTTPException
from pydantic import Field, field_validator

from backend.models import ContractModel, TravelPreferences
from backend.services.gemini_service import ParserUnavailable, extract_patch


class ParseRequest(ContractModel):
    text: str = Field(min_length=1, max_length=4000)
    current_preferences: TravelPreferences

    @field_validator('text')
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Enter your travel preferences.')
        return value.strip()


class ParseResponse(ContractModel):
    preferences: TravelPreferences
    extracted_fields: list[str]
    warnings: list[str]


router = APIRouter(prefix='/api/preferences', tags=['preferences'])


@router.post('/parse', response_model=ParseResponse)
async def parse_preferences(request: ParseRequest) -> ParseResponse:
    try:
        patch = await extract_patch(request.text)
        preferences = TravelPreferences.model_validate(request.current_preferences.model_dump() | patch)
    except ParserUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    warnings = []
    if preferences.budget_scope.value == 'total_trip':
        warnings.append('Budget fit cannot be verified without airfare. Flights are unknown.')
    return ParseResponse(preferences=preferences, extracted_fields=list(patch), warnings=warnings)
