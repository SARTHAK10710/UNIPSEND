"""
investment_advice.py – Text-based investment advice generator for UNISPEND_AI.

Produces a human-readable recommendation that takes into account:
- Estimated spare monthly capacity
- Financial health score
- Spender type

This is a lightweight narrative layer on top of the portfolio engine.
"""

from src.config import (
    HEALTH_TIER_HIGH,
    HEALTH_TIER_MID,
    INVESTMENT_RATIO,
    MIN_INVEST_AMOUNT,
    WEEKS_PER_MONTH,
)
from src.logger import logger


def generate_investment_advice(
    monthly_spend_estimate: float,
    predicted_next_week_spend: float,
    financial_health_score: float = 50.0,
    spender_type: str = "moderate",
) -> str:
    """
    Generate a personalised, human-readable investment recommendation.

    Parameters
    ----------
    monthly_spend_estimate : float
        Historical monthly spend estimate.
    predicted_next_week_spend : float
        Predicted next-week spending from the ML model.
    financial_health_score : float
        Health score in [0, 100]. Defaults to 50 if not provided.
    spender_type : str
        One of ``"low"``, ``"moderate"``, ``"high"``.

    Returns
    -------
    str
        A personalised advice string.
    """
    predicted_monthly = predicted_next_week_spend * WEEKS_PER_MONTH

    spare_capacity = max(0.0, monthly_spend_estimate - predicted_monthly)
    suggested_invest = round(monthly_spend_estimate * INVESTMENT_RATIO, 2)

    logger.info(
        "Investment advice: spare=%.2f, suggested=%.2f, health=%.1f, type=%s",
        spare_capacity, suggested_invest, financial_health_score, spender_type,
    )

    # --- Tier-based recommendation ----------------------------------------
    if financial_health_score >= HEALTH_TIER_HIGH:
        if spender_type == "low":
            tone = (
                f"Excellent financial health! You have a strong saving pattern. "
                f"Consider investing ₹{suggested_invest} this month in growth assets "
                f"like diversified equity funds or index ETFs."
            )
        else:
            tone = (
                f"Your finances are in good shape. "
                f"Aim to invest ₹{suggested_invest} this month — "
                f"diversified ETFs or technology sector funds are well-suited to your profile."
            )

    elif financial_health_score >= HEALTH_TIER_MID:
        if spare_capacity > 0:
            tone = (
                f"You have an estimated ₹{round(spare_capacity, 2)} in spare capacity this month. "
                f"A conservative investment of ₹{suggested_invest} in balanced funds or "
                f"large-cap stocks would be a prudent start."
            )
        else:
            tone = (
                "Your spending is tracking closely to your historical average. "
                "Focus on trimming discretionary expenses before committing to investments."
            )

    else:
        tone = (
            "Your financial health score is low, indicating elevated spending risk. "
            "Prioritise building a small emergency buffer before investing. "
            f"When ready, start small — even ₹{min(suggested_invest, MIN_INVEST_AMOUNT)} per month helps."
        )

    return tone