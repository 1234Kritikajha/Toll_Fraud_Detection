from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import NOTIFICATION_CATEGORIES, NOTIFICATION_ICON_MAP
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class NotificationsGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 5)

    def _load_alerts_cases_vehicles(self) -> tuple[list[str], list[str], list[str]]:
        import pandas as pd

        alerts = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "alerts.csv", usecols=["alert_id", "vehicle"], dtype=str)
        cases = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "cases.csv", usecols=["case_id"], dtype=str)
        vehicles = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "vehicles.csv", usecols=["plate"], dtype=str)
        alert_ids = alerts["alert_id"].tolist()
        case_ids = cases["case_id"].tolist()
        vehicle_plates = vehicles["plate"].tolist()
        return alert_ids, case_ids, vehicle_plates

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "notifications.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        alert_ids, case_ids, vehicle_plates = self._load_alerts_cases_vehicles()

        header = ["id", "title", "message", "category", "icon", "priority", "status", "action_url", "created_at"]

        priorities = ["Low", "Medium", "High", "Critical"]
        status_vals = ["Queued", "Sent", "Read", "Dismissed"]

        # Simple URL scheme matching expected frontend patterns
        action_urls = [
            "/alerts",
            "/investigation",
            "/vehicle-intelligence",
            "/fraud",
            "/notifications",
            "/live-monitoring",
            "/system/maintenance",
        ]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_NOTIFICATIONS + 1), desc="notifications"):
                category = self.rng.choices(NOTIFICATION_CATEGORIES, weights=[1.3, 1.1, 0.9, 0.7, 0.8, 0.2, 0.4, 0.6], k=1)[0]
                icon = NOTIFICATION_ICON_MAP.get(category, "bell")

                priority = self.rng.choices(priorities, weights=[0.35, 0.35, 0.2, 0.1], k=1)[0]
                status = self.rng.choices(status_vals, weights=[0.25, 0.45, 0.2, 0.1], k=1)[0]

                # Choose referenced entity
                ref_kind = self.rng.choices(["alert", "case", "vehicle"], weights=[0.45, 0.35, 0.20], k=1)[0]
                if ref_kind == "alert":
                    ref = self.rng.choice(alert_ids)
                    msg = f"New AI alert {ref} for vehicle {self.rng.choice(vehicle_plates)}. Review evidence & lane assignment." 
                    action_url = f"/alerts/{ref}"
                elif ref_kind == "case":
                    ref = self.rng.choice(case_ids)
                    msg = f"Investigation case {ref} updated with latest OCR/YOLO evidence. Risk scoring recalculated." 
                    action_url = f"/investigation/{ref}"
                else:
                    ref = self.rng.choice(vehicle_plates)
                    msg = f"Vehicle intelligence updated for plate {ref}. Potential watchlist match pending." 
                    action_url = f"/vehicle-intelligence?plate={ref}"

                title = f"{category}: Notification {str(i).zfill(5)}"

                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                created_at = format_dt_for_csv(dt)

                w.writerow([i, title, msg.strip(), category, icon, priority, status, action_url, created_at])

        return out_path

