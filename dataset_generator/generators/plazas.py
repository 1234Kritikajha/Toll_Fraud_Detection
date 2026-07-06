from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import TOLL_BASE_LANE_COUNTS, TOLL_PLAZAS
from dataset_generator.utils import format_dt_for_csv


@dataclass(frozen=True, slots=True)
class PlazaRow:
    id: int
    name: str
    state: str
    latitude: float
    longitude: float
    total_lanes: int
    active_lanes: int
    risk_score: int


class PlazasGenerator:
    """Generate 100+ realistic toll plaza rows."""

    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg

    def _expand_plazas(self) -> list[PlazaRow]:
        # Expand base seed plazas with realistic variations.
        base = list(TOLL_PLAZAS)
        rng = random.Random(self.cfg.RNG_SEED)
        needed = 110  # minimum 100+

        rows: list[PlazaRow] = []
        tpl = base
        idx = 0
        while len(rows) < needed:
            p = tpl[idx % len(tpl)]
            # Small coordinate jitter (still plausible)
            lat_j = rng.uniform(-0.08, 0.08)
            lon_j = rng.uniform(-0.08, 0.08)
            total_lanes = int(rng.choice(TOLL_BASE_LANE_COUNTS))
            active_lanes = max(1, min(total_lanes, int(round(total_lanes * rng.uniform(0.65, 0.9)))))
            risk = p.risk_seed
            # add deterministic-ish variation
            risk = min(100, max(0, int(risk + rng.randint(-10, 18))))

            suffix = rng.choice(["Expressway", "Bypass", "Outer", "Ring", "Service", "Gateway"])
            variant = rng.choice(["", " Toll Plaza", f" {suffix} Toll Plaza"])  # keep names realistic
            name = p.name
            if not variant:
                variant = ""
            if variant:
                # avoid doubling 'Toll Plaza'
                if "Toll Plaza" in name and variant.startswith(" Toll Plaza"):
                    variant = ""
                name = name.replace(" Toll Plaza", "") + variant

            rows.append(
                PlazaRow(
                    id=len(rows) + 1,
                    name=name,
                    state=p.state,
                    latitude=round(p.latitude + lat_j, 6),
                    longitude=round(p.longitude + lon_j, 6),
                    total_lanes=total_lanes,
                    active_lanes=active_lanes,
                    risk_score=risk,
                )
            )
            idx += 1

        # Keep stable order
        return rows[:needed]

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "plazas.csv"
        rows = self._expand_plazas()

        header = [
            "id",
            "name",
            "state",
            "latitude",
            "longitude",
            "total_lanes",
            "active_lanes",
            "risk_score",
        ]

        out_path.parent.mkdir(parents=True, exist_ok=True)
        # Chunked write using pandas-free csv approach
        import csv

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            for r in tqdm(rows, desc="plazas", total=len(rows)):
                w.writerow(
                    [
                        r.id,
                        r.name,
                        r.state,
                        r.latitude,
                        r.longitude,
                        r.total_lanes,
                        r.active_lanes,
                        r.risk_score,
                    ]
                )

        return out_path

