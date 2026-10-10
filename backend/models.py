from enum import Enum


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

