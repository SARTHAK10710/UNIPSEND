"""
investment_engine.py – Smart investment engine for UNISPEND_AI.

Responsibilities:
- Fetch historical price data from Alpha Vantage (with cache fallback)
- Detect asset trends and momentum
- Compute volatility-based risk scores
- Dynamically discover assets via SYMBOL_SEARCH
- Build a diversified portfolio weighted by trend/momentum/risk,
  with a per-asset allocation cap (MAX_PORTFOLIO_WEIGHT)

Cache behaviour:
- On API success  → prices saved to data/market_cache.json
- On API failure  → prices loaded from cache
- System never crashes due to API unavailability
"""

import json
import os
from typing import Dict, List, Optional

import numpy as np
import requests

from src.config import (
    ALPHA_VANTAGE_API_KEY,
    ALPHA_VANTAGE_BASE_URL,
    API_TIMEOUT,
    ASSETS_PER_KEYWORD,
    CACHE_FILE,
    DOWNTREND_THRESHOLD,
    FALLBACK_RISK_SCORE,
    FALLBACK_TICKERS,
    INVESTMENT_RATIO,
    LONG_MA_WINDOW,
    MAX_PORTFOLIO_WEIGHT,
    MIN_ASSET_SCORE,
    PRICE_HISTORY_DAYS,
    SHORT_MA_WINDOW,
    STRATEGY_KEYWORDS,
    UPTREND_THRESHOLD,
    VOLATILITY_SCALE_FACTOR,
)
from src.logger import logger


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _load_cache() -> Dict[str, List[float]]:
    """Load the market price cache from disk. Returns empty dict on failure."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not read cache file: %s", exc)
    return {}


def _save_cache(cache: Dict[str, List[float]]) -> None:
    """Persist *cache* to disk, creating directories as needed."""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=4)
    except OSError as exc:
        logger.warning("Could not write cache file: %s", exc)


# ---------------------------------------------------------------------------
# Data Fetching
# ---------------------------------------------------------------------------

def fetch_price_data(symbol: str) -> Optional[List[float]]:
    """
    Return the last ``PRICE_HISTORY_DAYS`` closing prices for *symbol*.

    Tries the Alpha Vantage TIME_SERIES_DAILY endpoint first.
    On any failure (network, rate-limit, bad response) the cache is used.
    The cache is updated whenever a live API response is received.

    Parameters
    ----------
    symbol : str
        Stock ticker, e.g. ``"AAPL"``.

    Returns
    -------
    list[float] or None
        Closing prices (newest first), or ``None`` if neither API nor cache
        can provide data.
    """
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "apikey": ALPHA_VANTAGE_API_KEY,
    }

    try:
        response = requests.get(
            ALPHA_VANTAGE_BASE_URL, params=params, timeout=API_TIMEOUT
        )
        data = response.json()          # parse once, reuse everywhere
    except Exception as exc:
        logger.warning("API request failed for %s: %s. Checking cache.", symbol, exc)
        data = {}

    if "Time Series (Daily)" in data:
        prices = [
            float(v["4. close"])
            for v in list(data["Time Series (Daily)"].values())[:PRICE_HISTORY_DAYS]
        ]
        logger.info("Fetched %d price points for %s from API.", len(prices), symbol)

        # Update cache with fresh data
        cache = _load_cache()
        cache[symbol] = prices
        _save_cache(cache)
        return prices

    # API failed or rate-limited – fall back to cache
    reason = data.get("Note") or data.get("Information") or "unknown error"
    logger.warning("API did not return data for %s (%s). Trying cache.", symbol, reason)

    cache = _load_cache()
    if symbol in cache:
        logger.info("Loaded %d cached price points for %s.", len(cache[symbol]), symbol)
        return cache[symbol]

    logger.error("No data available for %s (API and cache both failed).", symbol)
    return None


# ---------------------------------------------------------------------------
# Technical Analysis
# ---------------------------------------------------------------------------

def detect_market_trend(prices: List[float]) -> str:
    """
    Determine asset trend using a short-vs-long moving average crossover.

    Parameters
    ----------
    prices : list[float]
        Closing prices, newest first.

    Returns
    -------
    str
        ``"uptrend"``, ``"downtrend"``, or ``"sideways"``.
    """
    if not prices or len(prices) < LONG_MA_WINDOW:
        return "unknown"

    short_avg = sum(prices[:SHORT_MA_WINDOW]) / SHORT_MA_WINDOW      # short window
    long_avg  = sum(prices[:LONG_MA_WINDOW]) / LONG_MA_WINDOW    # long window

    if short_avg > long_avg * UPTREND_THRESHOLD:
        return "uptrend"
    elif short_avg < long_avg * DOWNTREND_THRESHOLD:
        return "downtrend"
    else:
        return "sideways"


def calculate_asset_risk(prices: List[float]) -> float:
    """
    Compute a 0–100 volatility-based risk score.

    Uses the standard deviation of daily log returns, scaled to [0, 100].

    Parameters
    ----------
    prices : list[float]
        Closing prices (at least 2 values required).

    Returns
    -------
    float
        Risk score in [0.0, 100.0].
    """
    if not prices or len(prices) < 2:
        return FALLBACK_RISK_SCORE  # neutral fallback

    arr = np.array(prices, dtype=float)
    returns = np.diff(arr) / arr[:-1]
    volatility = float(np.std(returns))
    risk = min(100.0, volatility * VOLATILITY_SCALE_FACTOR)
    return round(risk, 2)


def calculate_momentum(prices: List[float]) -> float:
    """
    Compute price momentum as the percentage change from oldest to newest.

    Parameters
    ----------
    prices : list[float]
        Closing prices, newest first. Requires at least 2 data points.

    Returns
    -------
    float
        Momentum value. Positive = gained, negative = lost. 0 on failure.
    """
    if not prices or len(prices) < 2:
        return 0.0

    newest = prices[0]
    oldest = prices[-1]                  # safe: no fixed-index access

    if oldest == 0:
        return 0.0

    return float((newest - oldest) / oldest)


# ---------------------------------------------------------------------------
# Asset Discovery
# ---------------------------------------------------------------------------

def discover_assets(keyword: str, limit: int = ASSETS_PER_KEYWORD) -> List[str]:
    """
    Search Alpha Vantage for US equity symbols matching *keyword*.

    Parameters
    ----------
    keyword : str
        Search term, e.g. ``"technology"``.
    limit : int
        Maximum number of symbols to return.

    Returns
    -------
    list[str]
        Discovered ticker symbols (may be empty if the API fails).
    """
    params = {
        "function": "SYMBOL_SEARCH",
        "keywords": keyword,
        "apikey": ALPHA_VANTAGE_API_KEY,
    }

    try:
        response = requests.get(
            ALPHA_VANTAGE_BASE_URL, params=params, timeout=API_TIMEOUT
        )
        data = response.json()           # single parse — bug fix
    except Exception as exc:
        logger.warning("Symbol search failed for '%s': %s", keyword, exc)
        return []

    if "bestMatches" not in data:
        logger.warning("No bestMatches in symbol search response for '%s'.", keyword)
        return []

    assets: List[str] = []
    for item in data["bestMatches"]:
        symbol      = item.get("1. symbol", "")
        asset_type  = item.get("3. type", "")
        region      = item.get("4. region", "")

        if (
            asset_type == "Equity"
            and "United States" in region
            and "." not in symbol       # exclude non-US suffixed tickers
        ):
            assets.append(symbol)

        if len(assets) >= limit:
            break

    logger.info("Discovered %d asset(s) for keyword '%s': %s", len(assets), keyword, assets)
    return assets


# ---------------------------------------------------------------------------
# Investment Strategy
# ---------------------------------------------------------------------------

def choose_investment_strategy(financial_health_score: float) -> str:
    """
    Map a financial health score to an investment strategy label.

    Parameters
    ----------
    financial_health_score : float
        Score in [0, 100].

    Returns
    -------
    str
        ``"safe"``, ``"balanced"``, or ``"growth"``.
    """
    if financial_health_score < 40:
        return "safe"
    elif financial_health_score < 70:
        return "balanced"
    else:
        return "growth"


# ---------------------------------------------------------------------------
# Portfolio Builder
# ---------------------------------------------------------------------------

def build_portfolio(
    monthly_spend: float,
    financial_health_score: float,
) -> Dict:
    """
    Construct a diversified investment portfolio.

    Process:
    1. Select strategy keywords based on ``financial_health_score``.
    2. Discover assets per keyword; fall back to ``FALLBACK_TICKERS`` if empty.
    3. Fetch price data for each asset; skip assets with insufficient data.
    4. Score each asset by momentum and low volatility.
    5. Normalise weights, then apply the ``MAX_PORTFOLIO_WEIGHT`` cap and
       re-normalise — ensuring no single asset dominates.

    Parameters
    ----------
    monthly_spend : float
        User's estimated monthly spend.
    financial_health_score : float
        Score in [0, 100].

    Returns
    -------
    dict
        ``{"total_investment": float, "portfolio": [{"asset": str, "allocation_percent": float}, ...]}``
    """
    strategy = choose_investment_strategy(financial_health_score)
    keywords = STRATEGY_KEYWORDS[strategy]
    logger.info("Building portfolio — strategy: %s, keywords: %s", strategy, keywords)

    # --- Asset discovery ---------------------------------------------------
    assets: List[str] = []
    for kw in keywords:
        assets += discover_assets(kw, limit=ASSETS_PER_KEYWORD)

    # Remove duplicates while preserving order
    seen: set = set()
    assets = [a for a in assets if not (a in seen or seen.add(a))]  # type: ignore[func-returns-value]

    if not assets:
        logger.warning("Asset discovery returned nothing. Using fallback tickers.")
        assets = FALLBACK_TICKERS

    # --- Score each asset --------------------------------------------------
    asset_scores = []
    for symbol in assets:
        prices = fetch_price_data(symbol)
        if prices is None or len(prices) < LONG_MA_WINDOW:
            logger.info("Skipping %s – insufficient price data.", symbol)
            continue

        trend    = detect_market_trend(prices)
        risk     = calculate_asset_risk(prices)
        momentum = calculate_momentum(prices)

        # Base score: momentum contribution + low-risk reward
        score = (momentum * 100) + (100.0 - risk)
        score = max(score, MIN_ASSET_SCORE)          # floor so all assets get weight

        asset_scores.append({
            "asset":    symbol,
            "score":    score,
            "risk":     risk,
            "trend":    trend,
            "momentum": round(momentum, 4),
        })

    if not asset_scores:
        logger.error("No usable asset data found. Returning empty portfolio.")
        return {
            "total_investment": round(monthly_spend * INVESTMENT_RATIO, 2),
            "portfolio": [],
            "note": "Market data unavailable. Try again later.",
        }

    # --- Raw weights -------------------------------------------------------
    total_score = sum(a["score"] for a in asset_scores)
    for a in asset_scores:
        a["weight"] = a["score"] / total_score

    # --- Diversification cap (Improvement 4) --------------------------------
    # Iteratively cap weights > MAX_PORTFOLIO_WEIGHT and redistribute excess
    for _ in range(len(asset_scores)):          # at most N passes to converge
        capped   = [a for a in asset_scores if a["weight"] >= MAX_PORTFOLIO_WEIGHT]
        uncapped = [a for a in asset_scores if a["weight"] <  MAX_PORTFOLIO_WEIGHT]

        if not capped:
            break

        excess = sum(a["weight"] - MAX_PORTFOLIO_WEIGHT for a in capped)
        for a in capped:
            a["weight"] = MAX_PORTFOLIO_WEIGHT

        if uncapped:
            uncapped_sum = sum(a["weight"] for a in uncapped)
            for a in uncapped:
                a["weight"] += excess * (a["weight"] / uncapped_sum if uncapped_sum else 1 / len(uncapped))

    # Final normalise (guard against floating-point drift)
    weight_sum = sum(a["weight"] for a in asset_scores)
    for a in asset_scores:
        a["weight"] /= weight_sum

    # --- Build output ------------------------------------------------------
    portfolio = [
        {
            "asset": a["asset"],
            "allocation_percent": round(a["weight"] * 100, 2),
        }
        for a in asset_scores
    ]

    invest_amount = round(monthly_spend * INVESTMENT_RATIO, 2)
    logger.info(
        "Portfolio built: %d assets, total_investment=%.2f",
        len(portfolio), invest_amount,
    )

    return {
        "total_investment": invest_amount,
        "portfolio": portfolio,
    }