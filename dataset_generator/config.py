"""Configuration for synthetic Indian toll dataset generation.

All counts can be overridden via environment variables.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _get_int(name: str, default: int) -> int:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return default
    return int(v)


@dataclass(frozen=True, slots=True)
class DatasetConfig:
    # Core entity counts
    NUMBER_OF_VEHICLES: int = _get_int("NUMBER_OF_VEHICLES", 15_000)
    NUMBER_OF_TRANSACTIONS: int = _get_int("NUMBER_OF_TRANSACTIONS", 50_000)
    NUMBER_OF_ALERTS: int = _get_int("NUMBER_OF_ALERTS", 8_000)
    NUMBER_OF_CASES: int = _get_int("NUMBER_OF_CASES", 5_000)
    NUMBER_OF_EVIDENCE: int = _get_int("NUMBER_OF_EVIDENCE", 20_000)
    NUMBER_OF_NOTIFICATIONS: int = _get_int("NUMBER_OF_NOTIFICATIONS", 15_000)
    NUMBER_OF_SEARCH_HISTORY: int = _get_int("NUMBER_OF_SEARCH_HISTORY", 10_000)

    # Chunking / performance
    CHUNK_SIZE: int = _get_int("CHUNK_SIZE", 10_000)
    RNG_SEED: int = _get_int("RNG_SEED", 42)

    # Timing
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")
    LAST_N_MONTHS: int = _get_int("LAST_N_MONTHS", 12)

    # Output
    OUTPUT_DIR: Path = Path(os.getenv("OUTPUT_DIR", "dataset_generator/output")).resolve()

    # Generation switches
    ONLY_VALIDATE_REFERENTIAL_INTEGRITY: bool = os.getenv(
        "ONLY_VALIDATE_REFERENTIAL_INTEGRITY", "false"
    ).lower() in {"1", "true", "yes"}

