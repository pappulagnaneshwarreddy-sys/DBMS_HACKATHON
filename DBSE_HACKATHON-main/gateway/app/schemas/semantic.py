from typing import Optional
from pydantic import BaseModel

class SimilarIncidentResponse(BaseModel):
    incident_id: str
    tracking_token: str
    status: str
    priority_score: float
    address_text: str
    situation_snippet: str
    cosine_similarity: float
    cosine_distance: float
