from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class TransactionsGenerator:
    def __init__(self, cfg: DatasetConfig, vehicles_path: Path | None = None):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 1)
        self.vehicles_path = vehicles_path

    def _load_vehicles_for_fk(self) -> list[dict[str, str]]:
        # Load minimal columns from vehicles.csv to ensure referential integrity.
        import pandas as pd

        df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "vehicles.csv", usecols=["plate", "fastag_id", "is_blacklisted"])
        return df.to_dict(orient="records")

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "transactions.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # Load vehicles and plazas catalogs
        vehicles = self._load_vehicles_for_fk()
        import pandas as pd

        plazas_df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "plazas.csv", usecols=["name", "total_lanes", "active_lanes", "risk_score"])
        plazas = plazas_df.to_dict(orient="records")

        # Precompute weight distribution by plaza risk
        weights = [max(0.1, float(p["risk_score"])) for p in plazas]

        header = ["id", "plate", "fastag_id", "plaza", "lane", "amount", "status", "detected_at"]

        statuses = ["Success", "Failed", "Low Balance", "Blacklisted", "Fraud Detected"]
        status_weights = [0.62, 0.12, 0.10, 0.06, 0.10]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_TRANSACTIONS + 1), desc="transactions"):
                v = self.rng.choice(vehicles)
                plate = str(v["plate"])
                fastag_id = str(v["fastag_id"])

                plaza = self.rng.choices(plazas, weights=weights, k=1)[0]["name"]
                # Find plaza record for lanes
                p_rec = next(p for p in plazas if p["name"] == plaza)
                total_lanes = int(p_rec["total_lanes"])
                # more likely to use active lanes
                if self.rng.random() < 0.85:
                    lane = self.rng.randint(1, int(p_rec["active_lanes"]))
                else:
                    lane = self.rng.randint(1, total_lanes)

                # amount: realistic toll-like values
                base = 30 + (abs(hash(plaza)) % 90)
                amount = int(round(base + self.rng.random() * 200))

                # status correlation with blacklist
                is_blacklisted = int(v["is_blacklisted"]) == 1
                if is_blacklisted:
                    # shift weights towards fraud/blacklisted
                    status_weights2 = [0.55, 0.10, 0.07, 0.18, 0.10]
                    status = self.rng.choices(statuses, weights=status_weights2, k=1)[0]
                else:
                    status = self.rng.choices(statuses, weights=status_weights, k=1)[0]

                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                detected_at = format_dt_for_csv(dt)

                w.writerow([i, plate, fastag_id, plaza, lane, amount, status, detected_at])

        return out_path

