from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path

from dataset_generator.config import DatasetConfig
from dataset_generator.generators.alerts import AlertsGenerator
from dataset_generator.generators.cases import CasesGenerator
from dataset_generator.generators.evidence import EvidenceGenerator
from dataset_generator.generators.notifications import NotificationsGenerator
from dataset_generator.generators.plazas import PlazasGenerator
from dataset_generator.generators.search_history import SearchHistoryGenerator
from dataset_generator.generators.transactions import TransactionsGenerator
from dataset_generator.generators.vehicles import VehiclesGenerator
from dataset_generator.utils import ensure_output_dir, setup_logging


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate synthetic Indian toll detection dataset")
    p.add_argument("--output-dir", type=str, default=None, help="Override output directory")
    return p


def main() -> None:
    setup_logging()
    logger = logging.getLogger("dataset_generator")

    args = build_arg_parser().parse_args()
    cfg = DatasetConfig()
    if args.output_dir:
        cfg = DatasetConfig(
            **{**cfg.__dict__, "OUTPUT_DIR": Path(args.output_dir).resolve()}  # type: ignore[arg-type]
        )

    ensure_output_dir(cfg.OUTPUT_DIR)

    logger.info("Starting dataset generation")
    logger.info("Output dir: %s", cfg.OUTPUT_DIR)

    t0 = time.perf_counter()

    # Plazas first so transactions can reference them.
    PlazasGenerator(cfg).generate()
    VehiclesGenerator(cfg).generate()
    TransactionsGenerator(cfg).generate()
    AlertsGenerator(cfg).generate()
    CasesGenerator(cfg).generate()
    EvidenceGenerator(cfg).generate()
    NotificationsGenerator(cfg).generate()
    SearchHistoryGenerator(cfg).generate()

    elapsed = time.perf_counter() - t0
    logger.info("Dataset generation completed in %.2f seconds", elapsed)
    print(f"Total generation time: {elapsed:.2f} seconds")


if __name__ == "__main__":
    main()

