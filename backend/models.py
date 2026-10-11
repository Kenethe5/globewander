from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ContractModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class ClimatePreference(str, Enum):
    WARM = "warm"
    MILD = "mild"
    COLD = "cold"
    ANY = "any"


class Interest(str, Enum):
    FOOD = "food"
    CULTURE = "culture"
    BEACHES = "beaches"
    NATURE = "nature"
    NIGHTLIFE = "nightlife"
    ADVENTURE = "adventure"


class BudgetScope(str, Enum):
    EXCLUDING_FLIGHTS = "excluding_flights"
    TOTAL_TRIP = "total_trip"


class TravelPreferences(ContractModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    origin_city: str | None = None
    budget_usd: float | None = Field(default=None, ge=0)
    budget_scope: BudgetScope = BudgetScope.EXCLUDING_FLIGHTS
    duration_days: int | None = Field(default=None, ge=1, le=30)
    travel_month: int | None = Field(default=None, ge=1, le=12)
    interests: list[Interest] = Field(default_factory=list)
    climate: ClimatePreference = ClimatePreference.ANY


class PriceRange(ContractModel):
    min: float = Field(ge=0)
    max: float = Field(ge=0)
    source_url: str | None = None
    checked_at: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    @model_validator(mode="after")
    def validate_range(self) -> "PriceRange":
        if self.min > self.max:
            raise ValueError("min must be less than or equal to max")
        return self
    
class DestinationSummary(ContractModel):
    id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1)
    country: str = Field(min_length=1)
    country_code: str = Field(pattern=r"^[A-Z]{3}$")
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    tags: list[Interest]
    image_url: str | None = None

class DestinationDetail(DestinationSummary):
    highlights: list[str]
    monthly_avg_temp_c: list[float | None] = Field(
        min_length=12,
        max_length=12,
    )
    lodging_per_night_usd: PriceRange | None = None
    daily_ex_lodging_usd: PriceRange | None = None
    climate_source_url: str | None = None
    climate_checked_at: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    cost_note: str | None = None

class BudgetStatus(str, Enum):
    WITHIN = "within"
    UNCERTAIN = "uncertain"
    OVER = "over"
    UNVERIFIED = "unverified"
    NOT_APPLICABLE = "not_applicable"


class ScoreBreakdown(ContractModel):
    interests: float | None = Field(ge=0, le=100)
    climate: float | None = Field(ge=0, le=100)
    affordability: float | None = Field(ge=0, le=100)


class OnsiteCostRange(ContractModel):
    min: float = Field(ge=0)
    max: float = Field(ge=0)

    @model_validator(mode="after")
    def validate_range(self) -> "OnsiteCostRange":
        if self.min > self.max:
            raise ValueError("min must be less than or equal to max")
        return self


class Recommendation(ContractModel):
    destination_id: str = Field(
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    score: float | None = Field(ge=0, le=100)
    eligible: bool
    breakdown: ScoreBreakdown
    budget_status: BudgetStatus
    estimated_onsite_total_usd: OnsiteCostRange | None
    reasons: list[str]
    tradeoffs: list[str]


class RecommendationResponse(BaseModel):
    results: list[Recommendation]
