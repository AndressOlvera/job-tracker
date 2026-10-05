from app.api import api_v1
from app.services.stats import compute_stats


@api_v1.get("/stats")
def get_stats():
    return compute_stats().model_dump(mode="json")
