"""
preprocessing.py – Data cleaning pipeline for UNISPEND_AI.

Cleans and prepares raw transaction DataFrames before feature
engineering or model inference.
"""

import pandas as pd

from src.config import REQUIRED_COLUMNS
from src.logger import logger


def _validate_columns(df: pd.DataFrame) -> None:
    """
    Raise ValueError if any required column is missing from *df*.

    Parameters
    ----------
    df : pd.DataFrame
        Raw transaction DataFrame to validate.
    """
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(
            f"Transaction data is missing required column(s): {missing}. "
            f"Expected columns: {REQUIRED_COLUMNS}"
        )


def clean_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and normalise a raw transaction DataFrame.

    Steps applied (in order):
    1. Validate that required columns are present.
    2. Drop exact duplicate rows.
    3. Parse timestamps safely; drop rows with unparseable dates.
    4. Drop rows with missing, zero, or negative amounts.
    5. Normalise the ``category`` column to lowercase stripped strings;
       drop rows with missing or empty categories.
    6. Derive ``date`` (date only) and ``hour`` (0–23) helper columns.

    Parameters
    ----------
    df : pd.DataFrame
        Raw transactions with at least ``time``, ``amount``, and
        ``category`` columns.

    Returns
    -------
    pd.DataFrame
        Cleaned DataFrame ready for feature engineering.

    Raises
    ------
    ValueError
        If a required column is absent or if the cleaned DataFrame
        contains fewer than 1 valid row.
    """
    logger.info("Starting data cleaning. Input rows: %d", len(df))

    # 1 – Validate required columns
    _validate_columns(df)

    # 2 – Drop exact duplicates
    before = len(df)
    df = df.drop_duplicates()
    dropped = before - len(df)
    if dropped:
        logger.info("Removed %d duplicate row(s).", dropped)

    # 3 – Parse timestamps; coerce bad values to NaT then drop them
    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    bad_timestamps = df["time"].isna().sum()
    if bad_timestamps:
        logger.warning("Dropping %d row(s) with invalid timestamps.", bad_timestamps)
    df = df.dropna(subset=["time"])

    # 4 – Remove invalid amounts (missing, zero, or negative)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    before = len(df)
    df = df.dropna(subset=["amount"])
    df = df[df["amount"] > 0]
    removed = before - len(df)
    if removed:
        logger.warning("Dropped %d row(s) with invalid amount values.", removed)

    # 5 – Normalise categories
    df["category"] = df["category"].astype(str).str.strip().str.lower()
    df = df[df["category"].notna() & (df["category"] != "") & (df["category"] != "nan")]

    # 6 – Derive helper columns
    df["date"] = df["time"].dt.date
    df["hour"] = df["time"].dt.hour

    df = df.reset_index(drop=True)

    if len(df) == 0:
        raise ValueError(
            "No valid transactions remain after cleaning. "
            "Please check your input data."
        )

    logger.info("Cleaning complete. Remaining rows: %d", len(df))
    return df