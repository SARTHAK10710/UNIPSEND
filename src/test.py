"""
test.py – Integration smoke test for UNISPEND_AI.

Run from the project root:

    python -m src.test

Exercises the full analysis pipeline with synthetic transaction data
and prints structured output for each module's result.
"""

import pprint
import sys

import pandas as pd

# Ensure project root is importable when running as __main__
sys.path.insert(0, ".")

from src.features import (
    calculate_spending_features,
    calculate_spending_heatmap,
    detect_spending_trend,
)
from src.financial_health import calculate_financial_health
from src.investment_advice import generate_investment_advice
from src.investment_engine import build_portfolio
from src.model import (
    calculate_risk_score,
    classify_spender_type,
    detect_anomalies,
    predict_next_week_spend,
)
from src.preprocessing import clean_transactions
from src.suggestions import generate_suggestion

# ---------------------------------------------------------------------------
# Synthetic transactions
# ---------------------------------------------------------------------------

SAMPLE_TRANSACTIONS = [
    {"time": "2024-01-01 08:30:00", "amount": 150.0,  "category": "Food"},
    {"time": "2024-01-01 13:00:00", "amount": 45.0,   "category": "transport"},
    {"time": "2024-01-02 10:00:00", "amount": 500.0,  "category": "shopping"},
    {"time": "2024-01-02 19:00:00", "amount": 80.0,   "category": "food"},
    {"time": "2024-01-03 09:00:00", "amount": 200.0,  "category": "Entertainment"},
    {"time": "2024-01-03 15:00:00", "amount": 60.0,   "category": "transport"},
    {"time": "2024-01-04 11:00:00", "amount": 1200.0, "category": "Shopping"},
    {"time": "2024-01-04 20:00:00", "amount": 90.0,   "category": "food"},
    {"time": "2024-01-05 08:00:00", "amount": 35.0,   "category": "transport"},
    {"time": "2024-01-05 18:00:00", "amount": 300.0,  "category": "healthcare"},
    # Introduce a deliberate anomaly
    {"time": "2024-01-06 10:00:00", "amount": 9500.0, "category": "shopping"},
    {"time": "2024-01-06 18:00:00", "amount": 70.0,   "category": "food"},
    {"time": "2024-01-07 09:00:00", "amount": 110.0,  "category": "food"},
    {"time": "2024-01-07 20:00:00", "amount": 55.0,   "category": "transport"},
]

pp = pprint.PrettyPrinter(indent=2, width=100)

if __name__ == "__main__":
    print("=" * 60)
    print("  UNISPEND AI – Integration Smoke Test")
    print("=" * 60)

    df_raw = pd.DataFrame(SAMPLE_TRANSACTIONS)

    # 1 – Preprocessing
    print("\n[1] Preprocessing...")
    df = clean_transactions(df_raw)
    print(f"    Rows after cleaning: {len(df)}")

    # 2 – Features
    print("\n[2] Feature Engineering...")
    features = calculate_spending_features(df)
    spending_trend = detect_spending_trend(df)
    heatmap = calculate_spending_heatmap(df)
    pp.pprint(features)
    print(f"    Spending trend : {spending_trend}")
    print(f"    Heatmap sample : {dict(list(heatmap.items())[:4])} ...")

    # 3 – Anomaly detection & risk
    print("\n[3] Anomaly Detection & Risk Scoring...")
    df, anomalies = detect_anomalies(df)
    risk_score = calculate_risk_score(df, anomalies)
    print(f"    Anomalies found: {len(anomalies)}")
    print(f"    Risk score     : {risk_score}")

    # 4 – Prediction
    print("\n[4] Spending Prediction...")
    next_week = predict_next_week_spend(df)
    print(f"    Predicted next-week spend: ₹{next_week}")

    # 5 – Segmentation
    print("\n[5] Spender Classification...")
    spender_type = classify_spender_type(df)
    print(f"    Spender type: {spender_type}")

    # 6 – Suggestions
    print("\n[6] Suggestions...")
    suggestions = generate_suggestion(
        features["category_percentages"], risk_score, spending_trend
    )
    for s in suggestions:
        print(f"    • {s}")

    # 7 – Financial health
    print("\n[7] Financial Health Score...")
    health_score = calculate_financial_health(risk_score, spending_trend, spender_type)
    print(f"    Health score: {health_score} / 100")

    # 8 – Investment advice (text only, no API call)
    print("\n[8] Investment Advice...")
    advice = generate_investment_advice(
        features["monthly_spend_estimate"],
        next_week,
        health_score,
        spender_type,
    )
    print(f"    {advice}")

    # 9 – Portfolio (uses cache / API)
    print("\n[9] Investment Portfolio (cache / API)...")
    portfolio = build_portfolio(features["monthly_spend_estimate"], health_score)
    pp.pprint(portfolio)

    print("\n" + "=" * 60)
    print("  ALL TESTS PASSED — no exceptions raised.")
    print("=" * 60)