"""
config.py – Central configuration for UNISPEND_AI.

All tunable parameters and magic numbers live here.
Import individual constants wherever you need them:

    from src.config import ANOMALY_CONTAMINATION, CACHE_FILE
"""

import logging
import os
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------

# Load variables from .env file if present
load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# Absolute path to the project root (one level above src/)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Market price cache (used by investment_engine)
CACHE_FILE: str = os.path.join(_PROJECT_ROOT, "data", "market_cache.json")

# Investment decision cache (used by api/app.py)
INVESTMENT_CACHE_FILE: str = os.path.join(_PROJECT_ROOT, "data", "investment_cache.json")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

# Global log level for the unispend logger (env override supported)
LOG_LEVEL: int = getattr(logging, os.getenv("LOG_LEVEL", "INFO"))

# Log output format
LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

# Log date format
LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"

# ---------------------------------------------------------------------------
# Data / Preprocessing
# ---------------------------------------------------------------------------

# Columns that MUST be present in the raw transaction DataFrame
REQUIRED_COLUMNS: list = ["time", "amount", "category"]

# Minimum number of valid transactions needed to run ML models
MIN_DATA_POINTS: int = 3

# ---------------------------------------------------------------------------
# ML – Anomaly Detection & Risk Scoring
# ---------------------------------------------------------------------------

# IsolationForest contamination: expected fraction of anomalies (0.0 – 0.5)
ANOMALY_CONTAMINATION: float = 0.05

# Random state seed for reproducible ML results
RANDOM_STATE: int = 42

# Weight of anomaly ratio in the composite risk score
RISK_ANOMALY_WEIGHT: float = 0.7

# Weight of volatility in the composite risk score
RISK_VOLATILITY_WEIGHT: float = 0.3

# KMeans n_init parameter for spender segmentation
KMEANS_N_INIT: int = 10

# ---------------------------------------------------------------------------
# Feature Engineering
# ---------------------------------------------------------------------------

# Number of calendar days to include in "weekly" spend calculation
WEEKLY_DAYS: int = 7

# Number of days used for monthly spend estimation (avg_daily × this)
MONTHLY_DAYS: int = 30

# Spending trend detection: slope must exceed this fraction of the mean
# daily spend for a trend to be classified as increasing or decreasing
TREND_THRESHOLD_RATIO: float = 0.05

# ---------------------------------------------------------------------------
# Financial Health Scoring
# ---------------------------------------------------------------------------

# Maximum risk penalty (risk_score × this value)
HEALTH_RISK_MULTIPLIER: float = 40.0

# Penalty applied when spending trend is "increasing"
HEALTH_TREND_INCREASING_PENALTY: float = 15.0

# Bonus applied when spending trend is "decreasing"
HEALTH_TREND_DECREASING_BONUS: float = 5.0

# Penalty applied for "high" spender type
HEALTH_HIGH_SPENDER_PENALTY: float = 20.0

# Penalty applied for "moderate" spender type
HEALTH_MODERATE_SPENDER_PENALTY: float = 10.0

# ---------------------------------------------------------------------------
# Suggestions
# ---------------------------------------------------------------------------

# A category whose share exceeds this percentage will trigger a suggestion
CATEGORY_ALERT_THRESHOLD: float = 30.0

# Risk score threshold above which a risk warning is issued
RISK_ALERT_THRESHOLD: float = 0.5

# Maximum percentage reduction to suggest for any single category
MAX_REDUCTION_PCT: int = 30

# ---------------------------------------------------------------------------
# Investment Engine – Market Analysis
# ---------------------------------------------------------------------------

# Moving average windows for trend detection (days)
SHORT_MA_WINDOW: int = 5
LONG_MA_WINDOW: int = 20

# Uptrend / downtrend multipliers for MA crossover
UPTREND_THRESHOLD: float = 1.005
DOWNTREND_THRESHOLD: float = 0.995

# Volatility-to-risk scaling factor
VOLATILITY_SCALE_FACTOR: float = 1000.0

# Default risk score when insufficient price data is available
FALLBACK_RISK_SCORE: float = 50.0

# Minimum asset score floor (ensures all assets get at least some weight)
MIN_ASSET_SCORE: float = 1.0

# ---------------------------------------------------------------------------
# Investment Engine – Portfolio Construction
# ---------------------------------------------------------------------------

# Fraction of monthly spend recommended for investment
INVESTMENT_RATIO: float = 0.10

# Maximum weight any single asset can hold in the portfolio (diversification cap)
MAX_PORTFOLIO_WEIGHT: float = 0.60

# Alpha Vantage API settings
ALPHA_VANTAGE_BASE_URL: str = "https://www.alphavantage.co/query"

# API key now read from environment variable
ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")

# API timeout (env override supported)
API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", 10))  # seconds

# Number of days of price history to fetch per symbol
PRICE_HISTORY_DAYS: int = 30

# Asset discovery keywords grouped by investment strategy
STRATEGY_KEYWORDS: dict = {
    "safe":     ["consumer", "healthcare", "bank"],
    "balanced": ["technology", "bank", "energy"],
    "growth":   ["technology", "semiconductor", "AI"],
}

# Fallback tickers when API discovery returns nothing
FALLBACK_TICKERS: list = ["AAPL", "MSFT", "NVDA"]

# Number of assets to discover per keyword
ASSETS_PER_KEYWORD: int = 1

# ---------------------------------------------------------------------------
# Investment Advice
# ---------------------------------------------------------------------------

# Average number of weeks per month (for spend projection)
WEEKS_PER_MONTH: float = 4.33

# Financial health score thresholds for tiered advice
HEALTH_TIER_HIGH: float = 70.0
HEALTH_TIER_MID: float = 40.0

# Minimum monthly investment amount for low-health-score users
MIN_INVEST_AMOUNT: float = 500.0

# ---------------------------------------------------------------------------
# API – Portfolio Endpoint
# ---------------------------------------------------------------------------

# Cache tolerance: re-use cached portfolio if health_score changed by ≤ this
PORTFOLIO_CACHE_TOLERANCE: float = float(os.getenv("PORTFOLIO_CACHE_TOLERANCE", 10.0))