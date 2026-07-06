from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class SearchHistoryGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 6)

    def _load_entities(self) -> tuple[list[str], list[str], list[str], list[str]]:
        import pandas as pd

        vehicles = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "vehicles.csv", usecols=["plate", "fastag_id"], dtype=str)
        alerts = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "alerts.csv", usecols=["alert_id"], dtype=str)
        cases = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "cases.csv", usecols=["case_id"], dtype=str)
        fastag_ids = vehicles["fastag_id"].tolist()
        plates = vehicles["plate"].tolist()
        alert_ids = alerts["alert_id"].tolist()
        case_ids = cases["case_id"].tolist()
        return plates, fastag_ids, alert_ids, case_ids

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "search_history.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        plates, fastag_ids, alert_ids, case_ids = self._load_entities()

        header = ["id", "query", "created_at"]

        # realistic query patterns
        def make_query() -> str:
            kind = self.rng.choices(
                ["plate", "fastag", "alert", "case", "mixed"],
                weights=[0.35, 0.2, 0.2, 0.15, 0.10],
                k=1,
            )[0]
            if kind == "plate":
                p = self.rng.choice(plates)
                return f"plate:{p}"
            if kind == "fastag":
                f = self.rng.choice(fastag_ids)
                return f"fastag:{f}"
            if kind == "alert":
                a = self.rng.choice(alert_ids)
                return f"alert_id:{a}"
            if kind == "case":
                c = self.rng.choice(case_ids)
                return f"case_id:{c}"
            # mixed
            p = self.rng.choice(plates)
            f = self.rng.choice(fastag_ids)
            a = self.rng.choice(alert_ids)
            c = self.rng.choice(case_ids)
            return f"plate:{p} fastag:{f} alert:{a} case:{c}"

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_SEARCH_HISTORY + 1), desc="search_history"):
                query = make_query()
                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                created_at = format_dt_for_csv(dt)
                w.writerow([i, query, created_at])

        return out_path

