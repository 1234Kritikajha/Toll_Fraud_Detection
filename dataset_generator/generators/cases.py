from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import CASE_TYPES
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class CasesGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 3)

    def _load_alerts(self) -> list[dict[str, str]]:
        import pandas as pd

        df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "alerts.csv", usecols=["alert_id", "type", "vehicle", "plaza", "severity"])
        return df.to_dict(orient="records")

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "cases.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        alerts = self._load_alerts()
        header = ["id", "case_id", "vehicle", "type", "plaza", "risk_score", "status", "priority", "created_at"]

        status_vals = ["New", "In Review", "Investigating", "Resolved", "Closed"]
        priority_vals = ["P1", "P2", "P3", "P4"]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_CASES + 1), desc="cases"):
                a = self.rng.choice(alerts)

                # risk score correlated with severity + alert type weights
                sev = str(a["severity"])
                sev_weight = {"Low": 0.25, "Medium": 0.5, "High": 0.75, "Critical": 0.95}.get(sev, 0.4)
                base = int(sev_weight * 100)
                risk = max(0, min(100, int(round(base + self.rng.randint(-15, 30)))))

                # priority
                if risk >= 85:
                    priority = "P1"
                elif risk >= 65:
                    priority = "P2"
                elif risk >= 40:
                    priority = "P3"
                else:
                    priority = "P4"

                status = self.rng.choices(status_vals, weights=[0.25, 0.30, 0.25, 0.15, 0.05], k=1)[0]

                case_type = self.rng.choice(CASE_TYPES)

                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                created_at = format_dt_for_csv(dt)

                case_id = f"CASE{str(i).zfill(6)}"

                w.writerow(
                    [
                        i,
                        case_id,
                        str(a["vehicle"]),
                        case_type,
                        str(a["plaza"]),
                        risk,
                        status,
                        priority,
                        created_at,
                    ]
                )

        return out_path

