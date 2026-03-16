"""
model.py – Machine learning models for UNISPEND_AI.

Provides:
- Anomaly detection      (IsolationForest)
- Risk score calculation (volatility + anomaly ratio)
- Spending prediction    (LinearRegression / moving average)
- User segmentation      (KMeans – fully data-driven, no hardcoded anchors)
"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression

from src.config import (
    ANOMALY_CONTAMINATION,
    KMEANS_N_INIT,
    MIN_DATA_POINTS,
    RANDOM_STATE,
    RISK_ANOMALY_WEIGHT,
    RISK_VOLATILITY_WEIGHT,
)
from src.logger import logger


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

def detect_anomalies(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Detect unusually high transactions using IsolationForest.

    Adds an ``anomaly_flag`` column to the DataFrame:
    - ``1``  → normal transaction
    - ``-1`` → anomaly

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data. Must contain an ``amount`` column.

    Returns
    -------
    tuple[pd.DataFrame, pd.DataFrame]
        ``(full_df_with_flag, anomaly_rows)``
    """
    logger.info("Running anomaly detection on %d transactions.", len(df))

    model = IsolationForest(
        contamination=ANOMALY_CONTAMINATION,
        random_state=RANDOM_STATE,
    )

    df = df.copy()
    df["anomaly_flag"] = model.fit_predict(df[["amount"]])

    anomalies = df[df["anomaly_flag"] == -1]
    logger.info("Anomalies detected: %d", len(anomalies))
    return df, anomalies


# ---------------------------------------------------------------------------
# Risk Score
# ---------------------------------------------------------------------------

def calculate_risk_score(df: pd.DataFrame, anomalies: pd.DataFrame) -> float:
    """
    Compute a composite risk score from anomaly ratio and spending volatility.

    Score formula:
        risk = (anomaly_ratio × 0.7) + (coefficient_of_variation × 0.3)

    Both components are capped at 1.0 before weighting so the combined
    score also stays in [0, 1].

    Parameters
    ----------
    df : pd.DataFrame
        Full cleaned (and anomaly-flagged) DataFrame.
    anomalies : pd.DataFrame
        Subset of *df* containing only anomalous rows.

    Returns
    -------
    float
        Risk score in the range [0.0, 1.0].
    """
    total = len(df)
    if total == 0:
        return 0.0

    anomaly_ratio = min(len(anomalies) / total, 1.0)

    avg = df["amount"].mean()
    std = df["amount"].std(ddof=0)
    volatility = (std / avg) if avg > 0 else 0.0
    volatility = min(volatility, 1.0)      # cap at 1.0

    risk = (anomaly_ratio * RISK_ANOMALY_WEIGHT) + (volatility * RISK_VOLATILITY_WEIGHT)
    logger.info(
        "Risk score: %.2f  (anomaly_ratio=%.2f, volatility=%.2f)",
        risk, anomaly_ratio, volatility,
    )
    return round(float(risk), 2)


# ---------------------------------------------------------------------------
# Spending Prediction
# ---------------------------------------------------------------------------

def predict_next_week_spend(df: pd.DataFrame) -> float:
    """
    Predict total spending for the next 7 days.

    Uses LinearRegression over daily totals when enough data is available;
    falls back to ``avg_daily × 7`` for smaller datasets.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data.

    Returns
    -------
    float
        Predicted week spend (>= 0).
    """
    daily = df.groupby("date")["amount"].sum().reset_index()
    daily.columns = ["date", "amount"]

    if len(daily) < MIN_DATA_POINTS:
        avg_daily = daily["amount"].mean()
        prediction = round(float(avg_daily * 7), 2)
        logger.info(
            "Insufficient data for regression. Using avg-based prediction: %.2f",
            prediction,
        )
        return prediction

    daily["day_index"] = np.arange(len(daily))
    X = daily[["day_index"]].values
    y = daily["amount"].values

    model = LinearRegression()
    model.fit(X, y)

    future = np.arange(len(daily), len(daily) + 7).reshape(-1, 1)
    predictions = np.clip(model.predict(future), 0, None)
    total = round(float(predictions.sum()), 2)

    logger.info("Predicted next-week spend (regression): %.2f", total)
    return total


# ---------------------------------------------------------------------------
# Spender Segmentation
# ---------------------------------------------------------------------------

def classify_spender_type(df: pd.DataFrame) -> str:
    """
    Classify the user as ``Saver``, ``Balanced Spender``, or ``Heavy Spender``
    using KMeans clustering.

    The model is trained on **percentile-derived anchors calculated from the
    user's own spending distribution**, not on hardcoded dollar amounts.
    This makes classification relative to the user's own data.

    Anchor construction:
        - Low anchor    (p10, p25, p10) → represents frugal behaviour
        - Mid anchor    (p50, p50, p50) → represents average behaviour
        - High anchor   (p90, p75, p90) → represents heavy behaviour

    Features used:
        ``total_spend``, ``avg_transaction``, ``transaction_count``

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned transaction data.

    Returns
    -------
    str
        One of ``"Saver"``, ``"Balanced Spender"``, or ``"Heavy Spender"``.
    """
    amounts = df["amount"].values

    # Build percentile-based training anchors relative to this user's data
    p10, p25, p50, p75, p90 = np.percentile(amounts, [10, 25, 50, 75, 90])
    n = len(df)

    anchors = np.array([
        [p10 * n * 0.5, p10, int(n * 0.4)],   # saver archetype
        [p50 * n,       p50, n],               # balanced archetype
        [p90 * n * 1.5, p90, int(n * 1.6)],   # heavy archetype
    ])

    # User's actual feature vector
    user_vec = np.array([[
        float(df["amount"].sum()),
        float(df["amount"].mean()),
        float(len(df)),
    ]])

    kmeans = KMeans(n_clusters=3, random_state=RANDOM_STATE, n_init=KMEANS_N_INIT)
    kmeans.fit(anchors)
    cluster = int(kmeans.predict(user_vec)[0])

    # Map cluster index to its nearest anchor label
    # Find which anchor index each centroid is closest to
    from sklearn.metrics import pairwise_distances
    centroid_to_anchor = np.argmin(
        pairwise_distances(kmeans.cluster_centers_, anchors), axis=1
    )
    anchor_label = int(centroid_to_anchor[cluster])

    labels = {0: "low", 1: "moderate", 2: "high"}
    spender_type = labels.get(anchor_label, "moderate")

    logger.info("Spender classification: %s", spender_type)
    return spender_type