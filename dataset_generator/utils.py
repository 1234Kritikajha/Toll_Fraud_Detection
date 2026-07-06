"""Utility helpers for generation and validation."""

from __future__ import annotations

import csv
import logging
import random
import re
import time
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Iterator, Sequence

import numpy as np


logger = logging.getLogger("dataset_generator")


PLATE_RE = re.compile(r"^[A-Z]{2}\\d{2}[A-Z]{2}\\d{4}$")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def indian_last_n_months_timestamp(rng: random.Random, last_n_months: int) -> datetime:
    # Approx: treat 1 month as 30 days.
    days = last_n_months * 30
    seconds = days * 24 * 3600
    offset = rng.random() * seconds
    return utc_now() - timedelta(seconds=offset)


def format_dt_for_csv(dt: datetime) -> str:
    # Keep ISO-8601 for DB import.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def chunked(iterable: Sequence[object], chunk_size: int) -> Iterator[list[object]]:
    for i in range(0, len(iterable), chunk_size):
        yield list(iterable[i : i + chunk_size])


def write_csv_header_if_needed(path: Path, header: list[str]) -> None:
    if not path.exists() or path.stat().st_size == 0:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(header)


def write_csv_rows(path: Path, header: list[str], rows: Iterable[list[object]]) -> None:
    write_csv_header_if_needed(path, header)
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for r in rows:
            writer.writerow(r)


def make_plate(state_code: str, rng: random.Random) -> str:
    # Format: XX99YYYY where XX is state code.
    # Example given: RJ14AB4587 -> state=RJ, series=14, letters=AB, number=4587
    series = rng.randint(10, 99)
    letters = "".join(rng.choice(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")) for _ in range(2))
    number = rng.randint(1000, 9999)
    plate = f"{state_code}{series:02d}{letters}{number:04d}"
    return plate


def make_fastag_id(plate: str, rng: random.Random) -> str:
    # Synthetic FASTag id: numeric-like with checksum suffix.
    # Deterministic by plate + RNG salt.
    salt = rng.randint(1000, 9999)
    base = abs(hash(plate)) % 10**10
    return f"FASTAG{base:010d}{salt:04d}"


def weighted_choice(rng: random.Random, items: Sequence[str], weights: Sequence[float]) -> str:
    return rng.choices(list(items), weights=list(weights), k=1)[0]


def sample_list(rng: random.Random, items: Sequence[str], k: int) -> list[str]:
    if k <= 0:
        return []
    if k >= len(items):
        return list(items)
    return rng.sample(list(items), k)


def timeit(fn):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - start
        return result, elapsed

    return wrapper


def validate_no_duplicate_plates(plates: Iterable[str]) -> bool:
    s = set()
    for p in plates:
        if p in s:
            return False
        s.add(p)
    return True

