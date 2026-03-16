"""
app.py – FastAPI application for UNISPEND_AI.

Endpoints:
    GET  /health                → system health check
    POST /analyze               → full transaction analysis (no portfolio call)
    GET  /investment-portfolio  → on-demand portfolio generation

The investment portfolio is intentionally separated from /analyze to
avoid hitting the Alpha Vantage rate limit on every analysis request.
"""

import json
import os
from typing import Any, Dict, List

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from src.config import INVESTMENT_CACHE_FILE, PORTFOLIO_CACHE_TOLERANCE
from src.features import (
    calculate_spending_features,
    calculate_spending_heatmap,
    detect_spending_trend,
)
from src.financial_health import calculate_financial_health
from src.investment_advice import generate_investment_advice
from src.investment_engine import build_portfolio
from src.logger import logger
from src.model import (
    calculate_risk_score,
    classify_spender_type,
    detect_anomalies,
    predict_next_week_spend,
)
from src.preprocessing import clean_transactions
from src.suggestions import generate_suggestion

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="UNISPEND AI",
    description="AI-powered personal finance analysis API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class Transaction(BaseModel):
    """A single financial transaction entry."""

    time: str
    amount: float
    category: str

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Transaction amount must be positive.")
        return v


class AnalyzeRequest(BaseModel):
    """Request body for POST /analyze."""

    transactions: List[Transaction]

    @field_validator("transactions")
    @classmethod
    def transactions_must_not_be_empty(cls, v: List[Transaction]) -> List[Transaction]:
        if not v:
            raise ValueError("transactions list must not be empty.")
        return v


# ---------------------------------------------------------------------------
# Cache helpers (lightweight – for investment portfolio only)
# ---------------------------------------------------------------------------

def _load_investment_cache() -> Dict[str, Any]:
    if os.path.exists(INVESTMENT_CACHE_FILE):
        try:
            with open(INVESTMENT_CACHE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Could not read investment cache: %s", e)
    return {}


def _save_investment_cache(data: Dict[str, Any]) -> None:
    try:
        os.makedirs(os.path.dirname(INVESTMENT_CACHE_FILE), exist_ok=True)
        with open(INVESTMENT_CACHE_FILE, "w") as f:
            json.dump(data, f, indent=4)
    except OSError as e:
        logger.warning("Could not write investment cache: %s", e)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check() -> Dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"}


@app.post("/analyze", tags=["Analysis"])
def analyze_transactions(request: AnalyzeRequest) -> Dict[str, Any]:
    """
    Run the full analysis pipeline on a list of transactions.

    Steps:
    1. Preprocessing & cleaning
    2. Feature engineering
    3. Anomaly detection + risk scoring
    4. Spending prediction
    5. User segmentation
    6. Suggestion generation
    7. Financial health scoring
    8. Investment text advice

    The investment **portfolio** is NOT generated here. Use
    ``GET /investment-portfolio`` on the investment page.
    """
    logger.info("POST /analyze — received %d transaction(s).", len(request.transactions))

    try:
        # Build DataFrame from request
        df = pd.DataFrame([t.model_dump() for t in request.transactions])

        # 1 – Preprocessing
        df = clean_transactions(df)

        # 2 – Feature engineering
        features = calculate_spending_features(df)
        spending_trend = detect_spending_trend(df)
        spending_heatmap = calculate_spending_heatmap(df)

        # 3 – Anomaly detection & risk
        df, anomalies = detect_anomalies(df)
        risk_score = calculate_risk_score(df, anomalies)

        # 4 – Spending prediction
        predicted_next_week_spend = predict_next_week_spend(df)

        # 5 – Segmentation
        spender_type = classify_spender_type(df)

        # 6 – Suggestions
        suggestions = generate_suggestion(
            features["category_percentages"],
            risk_score,
            spending_trend,
        )

        # 7 – Financial health
        financial_health_score = calculate_financial_health(
            risk_score,
            spending_trend,
            spender_type,
        )

        # 8 – Investment text advice (no API calls)
        investment_advice = generate_investment_advice(
            features["monthly_spend_estimate"],
            predicted_next_week_spend,
            financial_health_score,
            spender_type,
        )

    except ValueError as exc:
        logger.error("Validation / data error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during analysis: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred. Please try again.",
        )

    # Build category_distribution: absolute spend per category (from cleaned df)
    category_distribution: Dict[str, float] = (
        df.groupby("category")["amount"]
        .sum()
        .round(2)
        .to_dict()
    )

    result = {
        "weekly_spend":           features["weekly_spend"],
        "monthly_estimate":       features["monthly_spend_estimate"],
        "daily_spend":            features["daily_spend"],
        "category_distribution":  category_distribution,
        "spending_trend":         spending_trend,
        "risk_score":             risk_score,
        "spender_type":           spender_type,
        "financial_health_score": financial_health_score,
        "suggestions":            suggestions,
        "investment_advice":      investment_advice,
    }

    logger.info(
        "Analysis complete — health=%.1f, risk=%.2f, trend=%s, spender=%s",
        financial_health_score, risk_score, spending_trend, spender_type,
    )
    return result


@app.get("/investment-portfolio", tags=["Investment"])
def get_investment_portfolio(
    monthly_spend: float = 10000.0,
    health_score: float = 50.0,
) -> Dict[str, Any]:
    """
    Generate or retrieve the investment portfolio for a given user profile.

    Query parameters:
    - **monthly_spend**  : estimated monthly spend (default 10,000)
    - **health_score**   : financial health score 0–100 (default 50)

    The result is cached in ``data/investment_cache.json`` to avoid
    repeated Alpha Vantage API calls. The cache is invalidated when
    ``health_score`` changes by more than 10 points.

    On API failure, the system falls back to cached market data and will
    still return a portfolio from the cache.
    """
    logger.info(
        "GET /investment-portfolio — monthly_spend=%.2f, health_score=%.1f",
        monthly_spend, health_score,
    )

    if monthly_spend <= 0:
        raise HTTPException(status_code=422, detail="monthly_spend must be positive.")
    if not (0 <= health_score <= 100):
        raise HTTPException(status_code=422, detail="health_score must be between 0 and 100.")

    # Serve from investment cache if the score tier hasn't shifted
    cache = _load_investment_cache()
    cached_score = cache.get("health_score", -999)
    if cache.get("portfolio") and abs(cached_score - health_score) <= PORTFOLIO_CACHE_TOLERANCE:
        logger.info("Returning cached investment portfolio.")
        return {"portfolio": cache["portfolio"]}

    try:
        raw = build_portfolio(monthly_spend, health_score)
    except Exception as exc:
        logger.exception("Portfolio generation failed: %s", exc)
        # Return whatever is in cache rather than crashing
        if cache.get("portfolio"):
            logger.info("Returning stale cached portfolio as fallback.")
            return {"portfolio": cache["portfolio"]}
        raise HTTPException(
            status_code=503,
            detail="Investment data temporarily unavailable. Please try again shortly.",
        )

    # Convert allocation_percent → allocation (0–1 decimal) per contract
    portfolio_list = [
        {"asset": item["asset"], "allocation": round(item["allocation_percent"] / 100, 4)}
        for item in raw.get("portfolio", [])
    ]

    # Persist fresh portfolio (store the converted list)
    _save_investment_cache({"health_score": health_score, "portfolio": portfolio_list})
    return {"portfolio": portfolio_list}