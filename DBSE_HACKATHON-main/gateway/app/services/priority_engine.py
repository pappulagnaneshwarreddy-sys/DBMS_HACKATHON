import math
from typing import List, Dict, Any, Optional

CRITICAL_LIFE_ITEMS = {
    "INSULIN_VIAL",
    "OXYGEN_CYLINDER",
    "INFLATABLE_BOAT",
    "FIRST_AID_KIT"
}

CRITICAL_SUSTENANCE_ITEMS = {
    "WATER_CAN_20L",
    "FOOD_PACK_FAMILY"
}

def calculate_priority_score(
    severity: int,
    urgency: int,
    vulnerability_score: int,
    people_affected: int,
    requested_item_codes: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Deterministic, explainable rule-based priority engine.
    NOTE: This is an audited, reproducible rule-based heuristic, NOT a black-box ML model.

    Weights Distribution (Total 100.0 pts):
    - Severity (1 to 5): 25.0 pts max
    - Urgency / Time-to-Harm (1 to 5): 25.0 pts max
    - Vulnerability Factor (1 to 5): 20.0 pts max
    - Headcount Scale (N >= 1): 20.0 pts max (logarithmic scaling)
    - Resource Shortage Factor: 10.0 pts max (based on critical aid tags)
    """
    # 1. Severity points (0 to 25)
    s_clamped = max(1, min(5, severity))
    severity_pts = round((s_clamped / 5.0) * 25.0, 1)

    # 2. Urgency points (0 to 25)
    u_clamped = max(1, min(5, urgency))
    urgency_pts = round((u_clamped / 5.0) * 25.0, 1)

    # 3. Vulnerability points (0 to 20)
    v_clamped = max(1, min(5, vulnerability_score))
    vulnerability_pts = round((v_clamped / 5.0) * 20.0, 1)

    # 4. Headcount points (0 to 20)
    n_clamped = max(1, people_affected)
    # Log10 scale normalized: log10(1) = 0; log10(101) ~ 2.0
    headcount_raw = (math.log10(n_clamped + 1) / math.log10(101)) * 20.0
    headcount_pts = round(min(20.0, max(2.0, headcount_raw)), 1)

    # 5. Resource shortage factor (0 to 10)
    shortage_pts = 0.0
    item_codes = set(requested_item_codes or [])
    has_life_critical = bool(item_codes.intersection(CRITICAL_LIFE_ITEMS))
    has_sustenance = bool(item_codes.intersection(CRITICAL_SUSTENANCE_ITEMS))

    if has_life_critical:
        shortage_pts += 6.0
    if has_sustenance:
        shortage_pts += 4.0
    shortage_pts = min(10.0, shortage_pts)

    total_score = round(min(100.0, severity_pts + urgency_pts + vulnerability_pts + headcount_pts + shortage_pts), 1)

    # Construct explainable rationale
    reasons = []
    reasons.append(f"Severity level {s_clamped}/5 (+{severity_pts} pts)")
    reasons.append(f"Urgency level {u_clamped}/5 (+{urgency_pts} pts)")
    reasons.append(f"Vulnerability score {v_clamped}/5 (+{vulnerability_pts} pts)")
    reasons.append(f"{n_clamped} people affected (+{headcount_pts} pts)")
    if shortage_pts > 0:
        reasons.append(f"High-priority critical relief supplies requested (+{shortage_pts} pts)")
    else:
        reasons.append("Standard supply requests (+0.0 pts)")

    explanation = f"Score {total_score}/100: " + "; ".join(reasons) + "."

    return {
        "severity_factor": severity_pts,
        "urgency_factor": urgency_pts,
        "vulnerability_factor": vulnerability_pts,
        "headcount_factor": headcount_pts,
        "shortage_factor": shortage_pts,
        "total_score": total_score,
        "formula_version": "RELIEFLINK-PRIORITY-v1",
        "explanation": explanation
    }
