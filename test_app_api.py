"""
test_app_api.py – Dedicated API endpoint test script for UNISPEND_AI.

Purpose:
    Tests all three FastAPI endpoints in sequence:
        1. GET  /health              → liveness check
        2. POST /analyze             → full transaction analysis
        3. GET  /investment-portfolio → portfolio generation (uses values from #2)

    Includes a synthetic transaction generator for local testing
    when no real frontend is connected.

Usage:
    1. Start the API server:
           python -m uvicorn api.app:app --host 127.0.0.1 --port 8000
    2. Run this script:
           python test_app_api.py

Dependencies:
    requests, json, random, datetime  (all stdlib except requests)
"""

import json
import random
from datetime import datetime, timedelta

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "http://127.0.0.1:8000"

SEPARATOR = "-" * 60


# ---------------------------------------------------------------------------
# SYNTHETIC DATA GENERATOR (FOR LOCAL TESTING ONLY)
# Comment out this block when real frontend data is connected
# ---------------------------------------------------------------------------

def generate_synthetic_transactions(num_transactions=15, num_days=7):
    """
    Generate a list of realistic spending transactions for testing.

    Parameters
    ----------
    num_transactions : int
        Number of transactions to generate.
    num_days : int
        Spread transactions across this many days.

    Returns
    -------
    list[dict]
        Each dict has keys: "time", "amount", "category".
    """
    categories = ["food", "transport", "shopping", "entertainment", "groceries"]

    # Amount ranges per category (min, max) for realistic values
    amount_ranges = {
        "food":          (50, 800),
        "transport":     (20, 300),
        "shopping":      (100, 3000),
        "entertainment": (50, 500),
        "groceries":     (100, 1500),
    }

    base_date = datetime.now() - timedelta(days=num_days)
    transactions = []

    for _ in range(num_transactions):
        category = random.choice(categories)
        low, high = amount_ranges[category]
        amount = round(random.uniform(low, high), 2)

        # Random day and hour within the range
        day_offset = random.randint(0, num_days - 1)
        hour = random.randint(6, 23)
        minute = random.choice([0, 15, 30, 45])

        timestamp = base_date + timedelta(days=day_offset, hours=hour, minutes=minute)
        time_str = timestamp.strftime("%Y-%m-%d %H:%M")

        transactions.append({
            "time": time_str,
            "amount": amount,
            "category": category,
        })

    return transactions


# ---------------------------------------------------------------------------
# END OF SYNTHETIC DATA GENERATOR
# ---------------------------------------------------------------------------


def test_health():
    """Test GET /health endpoint."""
    print(SEPARATOR)
    print("Testing /health endpoint")
    print(SEPARATOR)

    response = requests.get(f"{BASE_URL}/health")

    print(f"Status Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
    print()

    return response.status_code == 200


def test_analyze(transactions):
    """
    Test POST /analyze endpoint.

    Parameters
    ----------
    transactions : list[dict]
        Transaction list to send as the request body.

    Returns
    -------
    dict or None
        The parsed response JSON, or None on failure.
    """
    print(SEPARATOR)
    print("Testing /analyze endpoint")
    print(SEPARATOR)

    payload = {"transactions": transactions}

    response = requests.post(
        f"{BASE_URL}/analyze",
        json=payload,
    )

    print(f"Status Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
    print()

    if response.status_code == 200:
        return response.json()
    return None


def test_investment_portfolio(monthly_spend, health_score):
    """
    Test GET /investment-portfolio endpoint.

    Parameters
    ----------
    monthly_spend : float
        Monthly spend estimate (from /analyze response).
    health_score : float
        Financial health score (from /analyze response).
    """
    print(SEPARATOR)
    print("Testing /investment-portfolio endpoint")
    print(SEPARATOR)

    params = {
        "monthly_spend": monthly_spend,
        "health_score": health_score,
    }

    response = requests.get(
        f"{BASE_URL}/investment-portfolio",
        params=params,
    )

    print(f"Status Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
    print()

    return response.status_code == 200


def main():
    """Run the full API test flow: health → analyze → investment portfolio."""
    print()
    print("=" * 60)
    print("  UNISPEND AI – API Endpoint Test Script")
    print("=" * 60)
    print()

    # Step 1 — Health check
    health_ok = test_health()
    if not health_ok:
        print("ERROR: /health endpoint failed. Is the server running?")
        return

    # Step 2 — Generate synthetic transactions
    # -------------------------------------------------
    # SYNTHETIC DATA GENERATOR (FOR LOCAL TESTING ONLY)
    # Comment out this block when real frontend data is connected
    # -------------------------------------------------
    transactions = generate_synthetic_transactions(num_transactions=15, num_days=7)
    # -------------------------------------------------
    # END SYNTHETIC BLOCK — replace with real data above
    # -------------------------------------------------

    print(SEPARATOR)
    print(f"Generated {len(transactions)} synthetic transactions")
    print(SEPARATOR)
    print(json.dumps(transactions[:3], indent=2))
    print(f"  ... and {len(transactions) - 3} more")
    print()

    # Step 3 — Analyze transactions
    analysis = test_analyze(transactions)
    if analysis is None:
        print("ERROR: /analyze endpoint failed.")
        return

    # Step 4 — Extract values for portfolio call
    monthly_estimate = analysis.get("monthly_estimate", 10000)
    financial_health_score = analysis.get("financial_health_score", 50)

    print(SEPARATOR)
    print("Extracted from /analyze response:")
    print(f"  monthly_estimate       = {monthly_estimate}")
    print(f"  financial_health_score = {financial_health_score}")
    print(SEPARATOR)
    print()

    # Step 5 — Investment portfolio
    test_investment_portfolio(monthly_estimate, financial_health_score)

    # Summary
    print("=" * 60)
    print("  ALL ENDPOINT TESTS COMPLETED")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
