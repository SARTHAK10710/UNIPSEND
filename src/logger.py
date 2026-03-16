"""
logger.py – Shared logger for UNISPEND_AI.

Import this in every module instead of calling logging.getLogger()
directly, so all log output shares a consistent format.

Usage:
    from src.logger import logger
    logger.info("Processing %d transactions", len(df))
"""

import logging

from src.config import LOG_DATE_FORMAT, LOG_FORMAT, LOG_LEVEL

# Configure once at the application level.
# FastAPI / uvicorn will NOT override this because it is set before
# any module-level code runs at import time.
logging.basicConfig(
    level=LOG_LEVEL,
    format=LOG_FORMAT,
    datefmt=LOG_DATE_FORMAT,
)

logger: logging.Logger = logging.getLogger("unispend")
