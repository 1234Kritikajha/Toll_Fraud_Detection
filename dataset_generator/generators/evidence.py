from __future__ import annotations

import csv
import random
from pathlib import Path

from tqdm import tqdm

from dataset_generator.config import DatasetConfig
from dataset_generator.constants import EVIDENCE_FILE_TYPES
from dataset_generator.utils import format_dt_for_csv, indian_last_n_months_timestamp


class EvidenceGenerator:
    def __init__(self, cfg: DatasetConfig):
        self.cfg = cfg
        self.rng = random.Random(cfg.RNG_SEED + 4)

    def _load_cases(self) -> list[str]:
        import pandas as pd

        df = pd.read_csv(Path(self.cfg.OUTPUT_DIR) / "cases.csv", usecols=["case_id"])
        return df["case_id"].astype(str).tolist()

    def generate(self) -> Path:
        out_path = Path(self.cfg.OUTPUT_DIR) / "evidence.csv"
        out_path.parent.mkdir(parents=True, exist_ok=True)

        case_ids = self._load_cases()

        header = ["id", "case_id", "filename", "file_type", "file_path", "uploaded_at"]

        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)

            for i in tqdm(range(1, self.cfg.NUMBER_OF_EVIDENCE + 1), desc="evidence"):
                case_id = self.rng.choice(case_ids)
                file_type = self.rng.choices(EVIDENCE_FILE_TYPES, weights=[0.55, 0.15, 0.10, 0.20], k=1)[0]

                ext = {"image": "jpg", "video": "mp4", "csv": "csv", "log": "txt"}[file_type]
                # realistic filename pattern
                filename = f"{case_id}_{self.rng.randint(1,999999):06d}.{ext}"
                file_path = f"/uploads/evidence/{case_id}/{filename}"

                dt = indian_last_n_months_timestamp(self.rng, self.cfg.LAST_N_MONTHS)
                uploaded_at = format_dt_for_csv(dt)

                w.writerow([i, case_id, filename, file_type, file_path, uploaded_at])

        return out_path

