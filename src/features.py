"""
features.py – Feature engineering for UNISPEND_AI.

All features are derived purely from the cleaned transaction DataFrame.
Nothing is hardcoded.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd

from src.config import MONTHLY_DAYS, TREND_THRESHOLD_RATIO, WEEKLY_DAYS
from src.logger import logger


def calculate_spending_features(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute a rich set of spending features from a cleaned DataFrame.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data (output of ``clean_transactions``).
        Must contain: ``date``, ``amount``, ``category``.

    Returns
    -------
    dict with keys:
        - ``daily_spend``          : {date_str: total_amount} mapping
        - ``weekly_spend``         : total spending in the last 7 calendar days
        - ``monthly_spend_estimate``: estimated 30-day spend based on daily average
        - ``avg_transaction``      : mean transaction value
        - ``category_percentages`` : {category: % of total} rounded to 2 dp
    """
    logger.info("Calculating spending features for %d transactions.", len(df))

    # --- Daily spend ----------------------------------------------------------
    daily_series = df.groupby("date")["amount"].sum()
    daily_spend: Dict[str, float] = {
        str(d): round(float(v), 2) for d, v in daily_series.items()
    }

    # --- Weekly spend (last 7 calendar days) ---------------------------------
    max_date = df["time"].max()
    cutoff = max_date - pd.Timedelta(days=WEEKLY_DAYS)
    weekly_spend = float(df[df["time"] >= cutoff]["amount"].sum())

    # --- Monthly estimate (avg daily × 30) -----------------------------------
    num_days = max(df["date"].nunique(), 1)
    avg_daily = df["amount"].sum() / num_days
    monthly_spend_estimate = float(avg_daily * MONTHLY_DAYS)

    # --- Average transaction --------------------------------------------------
    avg_transaction = float(df["amount"].mean())

    # --- Category percentages -------------------------------------------------
    category_spend = df.groupby("category")["amount"].sum()
    total = category_spend.sum()
    category_percentages: Dict[str, float] = (
        (category_spend / total * 100).round(2).to_dict()
    )

    result = {
        "daily_spend": daily_spend,
        "weekly_spend": round(weekly_spend, 2),
        "monthly_spend_estimate": round(monthly_spend_estimate, 2),
        "avg_transaction": round(avg_transaction, 2),
        "category_percentages": category_percentages,
    }

    logger.info(
        "Features computed: monthly_estimate=%.2f, weekly=%.2f",
        monthly_spend_estimate,
        weekly_spend,
    )
    return result


def detect_spending_trend(df: pd.DataFrame) -> str:
    """
    Determine whether spending is increasing, decreasing, or stable.

    Uses the slope of a least-squares linear fit over daily totals,
    which is more robust than simply comparing first vs last day.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data.

    Returns
    -------
    str
        One of ``"increasing"``, ``"decreasing"``, or ``"stable"``.
    """
    daily_series = df.groupby("date")["amount"].sum()

    if len(daily_series) < 2:
        logger.info("Not enough daily data points for trend detection. Returning 'stable'.")
        return "stable"

    x = np.arange(len(daily_series), dtype=float)
    y = daily_series.values.astype(float)

    slope = float(np.polyfit(x, y, 1)[0])

    # Threshold: slope must be >5% of the mean daily spend to count as a trend
    threshold = float(y.mean()) * TREND_THRESHOLD_RATIO

    if slope > threshold:
        trend = "increasing"
    elif slope < -threshold:
        trend = "decreasing"
    else:
        trend = "stable"

    logger.info("Spending trend: %s (slope=%.2f, threshold=%.2f)", trend, slope, threshold)
    return trend


def calculate_spending_heatmap(df: pd.DataFrame) -> Dict[int, float]:
    """
    Compute total spending per hour of day (0–23).

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data. Must contain ``hour`` and ``amount``.

    Returns
    -------
    dict
        Mapping ``{hour: total_amount}`` for all hours present in the data.
    """
    heatmap = df.groupby("hour")["amount"].sum()
    return {int(h): round(float(v), 2) for h, v in heatmap.items()}