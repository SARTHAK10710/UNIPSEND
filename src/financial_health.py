"""
financial_health.py – Financial health score calculator for UNISPEND_AI.

Produces a single 0–100 score combining risk, spending trend,
and spender type. Higher = healthier finances.
"""

from src.config import (
    HEALTH_HIGH_SPENDER_PENALTY,
    HEALTH_MODERATE_SPENDER_PENALTY,
    HEALTH_RISK_MULTIPLIER,
    HEALTH_TREND_DECREASING_BONUS,
    HEALTH_TREND_INCREASING_PENALTY,
)
from src.logger import logger


def calculate_financial_health(
    risk_score: float,
    spending_trend: str,
    spender_type: str,
) -> float:
    """
    Calculate a holistic financial health score between 0 and 100.

    Scoring logic:
    - Starts at 100.
    - Risk penalty   : up to 40 points (risk_score is in [0, 1]).
    - Trend penalty  : −15 for increasing, no change for stable,
                       +5 bonus for decreasing (reward positive behaviour).
    - Spender penalty: −20 for Heavy Spender, −10 for Balanced Spender,
                       no change for Saver.

    Parameters
    ----------
    risk_score : float
        Value in [0.0, 1.0] from ``calculate_risk_score()``.
    spending_trend : str
        One of ``"increasing"``, ``"stable"``, or ``"decreasing"``.
    spender_type : str
        One of ``"low"``, ``"moderate"``, or ``"high"``.

    Returns
    -------
    float
        Financial health score clamped to [0.0, 100.0].
    """
    score = 100.0

    # --- Risk penalty (0–40 points) ------------------------------------------
    risk_penalty = risk_score * HEALTH_RISK_MULTIPLIER
    score -= risk_penalty
    logger.info("Risk penalty: -%.2f (risk_score=%.2f)", risk_penalty, risk_score)

    # --- Spending trend adjustment -------------------------------------------
    if spending_trend == "increasing":
        score -= HEALTH_TREND_INCREASING_PENALTY
        logger.info("Trend penalty: -15 (increasing)")
    elif spending_trend == "decreasing":
        score += HEALTH_TREND_DECREASING_BONUS
        logger.info("Trend bonus: +5 (decreasing)")

    # --- Spender type penalty ------------------------------------------------
    if spender_type == "high":
        score -= HEALTH_HIGH_SPENDER_PENALTY
        logger.info("Spender penalty: -20 (high spender)")
    elif spender_type == "moderate":
        score -= HEALTH_MODERATE_SPENDER_PENALTY
        logger.info("Spender penalty: -10 (moderate spender)")

    # --- Clamp to [0, 100] ---------------------------------------------------
    score = max(0.0, min(100.0, score))
    logger.info("Financial health score: %.2f", score)
    return round(score, 2)