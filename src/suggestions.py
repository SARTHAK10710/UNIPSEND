"""
suggestions.py – Dynamic suggestion engine for UNISPEND_AI.

Generates personalised spending advice by looping over ALL categories
in the data — nothing is hardcoded by category name.
"""

from typing import Dict, List

from src.config import CATEGORY_ALERT_THRESHOLD, MAX_REDUCTION_PCT, RISK_ALERT_THRESHOLD
from src.logger import logger


def generate_suggestion(
    category_percentages: Dict[str, float],
    risk_score: float,
    spending_trend: str,
) -> List[str]:
    """
    Generate dynamic, personalised spending suggestions.

    Rules applied:
    1. **Category alerts** – any category whose share exceeds
       ``CATEGORY_ALERT_THRESHOLD`` (default 30 %) triggers a suggestion.
       The nudge amount is proportional to how far it exceeds the threshold.
    2. **Risk alert** – high risk score triggers a general caution.
    3. **Trend alerts** – increasing trend triggers a monitoring reminder;
       decreasing trend earns a positive reinforcement message.
    4. **Default message** – returned only when no other suggestions fire.

    Parameters
    ----------
    category_percentages : dict
        ``{category_name: percentage_of_total}`` from feature engineering.
    risk_score : float
        Value in [0.0, 1.0].
    spending_trend : str
        One of ``"increasing"``, ``"stable"``, ``"decreasing"``.

    Returns
    -------
    list[str]
        One or more suggestion strings.
    """
    suggestions: List[str] = []

    # 1 – Category-level alerts (fully dynamic, no hardcoded names)
    for category, pct in category_percentages.items():
        pct = round(pct, 1)
        if pct > CATEGORY_ALERT_THRESHOLD:
            excess = round(pct - CATEGORY_ALERT_THRESHOLD, 1)
            # Suggest a reduction that brings it back to near the threshold
            reduction_pct = min(round((excess / pct) * 100), MAX_REDUCTION_PCT)
            label = category.capitalize()
            suggestions.append(
                f"{label} spending is high at {pct}% of your total. "
                f"Try reducing it by around {reduction_pct}%."
            )
            logger.info("Suggestion fired for category '%s' at %.1f%%.", category, pct)

    # 2 – Risk alert
    if risk_score > RISK_ALERT_THRESHOLD:
        suggestions.append(
            "Your spending risk is elevated. "
            "Try to avoid large one-off transactions and spread spending evenly."
        )
        logger.info("Risk suggestion fired (risk_score=%.2f).", risk_score)

    # 3 – Trend alerts
    if spending_trend == "increasing":
        suggestions.append(
            "Your spending trend is increasing week-on-week. "
            "Review recent transactions and set a weekly budget cap."
        )
    elif spending_trend == "decreasing":
        suggestions.append(
            "Great job! Your spending is trending downward. "
            "Consider redirecting the savings into your investment fund."
        )

    # 4 – Default fallback
    if not suggestions:
        suggestions.append(
            "Your spending habits look balanced across all categories. Keep it up!"
        )

    logger.info("Generated %d suggestion(s).", len(suggestions))
    return suggestions