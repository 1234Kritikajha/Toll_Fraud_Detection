from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import ALERT_SEVERITIES, ALERT_TYPES
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class AlertsGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 2)

    def _load_vehicles_plates(self) -> list[str]:
        import pandas as pd

        df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "vehicles.csv", usecols=["plate"])
        return df["plate"].astype(str).tolist()

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "alerts.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        plates = self._load_vehicles_plates()
        import pandas as pd

        plazas_df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "plazas.csv", usecols=["name"])
        plaza_names = plazas_df["name"].astype(str).tolist()

        header = ["id", "alert_id", "type", "vehicle", "plaza", "severity", "status", "assigned_to", "created_at"]

        severities = ALERT_SEVERITIES
        status_vals = ["Open", "Assigned", "Resolved", "Escalated"]
        assigned_to = ["AI_Team_01", "Fraud_Ops_02", "Security_Desk_03", "Camera_Monitor_04"]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_ALERTS + 1), desc="alerts"):
                alert_type = self.rng.choices(ALERT_TYPES, weights=[1, 1.2, 0.9, 1.0, 1.1, 1.2, 0.8, 0.9, 1.0, 0.3], k=1)[0]
                severity = self.rng.choices(severities, weights=[0.25, 0.45, 0.25, 0.05], k=1)[0]
                status = self.rng.choices(status_vals, weights=[0.38, 0.22, 0.30, 0.10], k=1)[0]
                assigned = self.rng.choice(assigned_to)

                vehicle_plate = self.rng.choice(plates)
                plaza = self.rng.choice(plaza_names)

                alert_id = f"ALRT{str(i).zfill(6)}"

                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                created_at = format_dt_for_csv(dt)

                w.writerow([i, alert_id, alert_type, vehicle_plate, plaza, severity, status, assigned, created_at])

        return out_path

