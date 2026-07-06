from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import VEHICLE_COLORS, VEHICLE_MAKES, VEHICLE_MODELS, STATE_CODES
from dataset_generator.utils import make_fastag_id, make_plate


@dataclass(frozen=True, slots=True)
class VehicleRow:
    id: int
    plate: str
    make: str
    model: str
    color: str
    is_blacklisted: bool
    fastag_id: str
    created_at: str


class VehiclesGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED)

    def _created_at(self, i: int) -> str:
        # simple deterministic-ish timestamps within last N months
        from dataset_generator.utils import indian_last_n_months_timestamp, format_dt_for_csv

        dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
        return format_dt_for_csv(dt)

    def generate(self) -> dict[str, dict[str, str]]:
        out_path = Path(self.cfg.OUTPUT_DIR) / "vehicles.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        plate_set: set[str] = set()
        seen_fastag: set[str] = set()

        rows_written = 0
        vehicles_by_plate: dict[str, dict[str, str]] = {}

        header = ["id", "plate", "make", "model", "color", "is_blacklisted", "fastag_id", "created_at"]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_VEHICLES + 1), desc="vehicles"):
                # Generate unique plate
                for _ in range(10_000):
                    state = self.rng.choice(STATE_CODES)
                    plate = make_plate(state, self.rng)
                    if plate not in plate_set:
                        break
                else:
                    raise RuntimeError("Unable to generate unique plates")

                plate_set.add(plate)

                fastag_id = make_fastag_id(plate, self.rng)
                # Ensure uniqueness
                while fastag_id in seen_fastag:
                    fastag_id = make_fastag_id(plate, self.rng)
                seen_fastag.add(fastag_id)

                make = self.rng.choice(VEHICLE_MAKES)
                model = self.rng.choice(VEHICLE_MODELS)
                color = self.rng.choice(VEHICLE_COLORS)

                # blacklist probability
                # More likely among "older" style using hash proxy
                p = (abs(hash(plate)) % 1000) / 1000
                is_blacklisted = p < 0.02  # ~2%

                created_at = self._created_at(i)

                is_blacklisted_int = 1 if is_blacklisted else 0

                w.writerow([i, plate, make, model, color, is_blacklisted_int, fastag_id, created_at])
                rows_written += 1

                vehicles_by_plate[plate] = {"id": str(i), "fastag_id": fastag_id, "is_blacklisted": is_blacklisted_int}

        return vehicles_by_plate

