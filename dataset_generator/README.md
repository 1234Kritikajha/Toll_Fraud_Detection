# dataset_generator

Production-style synthetic dataset generator for an AI Toll Detection System.

## What it generates
Creates the following CSV files inside `dataset_generator/output/`:
- `plazas.csv`
- `vehicles.csv`
- `transactions.csv`
- `alerts.csv`
- `cases.csv`
- `evidence.csv`
- `notifications.csv`
- `search_history.csv`

All datasets are **referentially linked**:
- Every `transactions.plate` exists in `vehicles.plate`
- Every `alerts.vehicle` exists in `vehicles.plate`
- Every `cases.case_id` originates from an alert/suspicious transaction via generator logic
- Every `evidence.case_id` references an existing case
- Notifications and search queries reference generated alerts/cases/vehicles/FASTag IDs

## Installation
Python 3.12+

```bash
cd c:/Users/preet/Desktop/intern_delhi_project/dataset_generator
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration (dataset size)
Edit environment variables or keep defaults in `config.py`.

Key variables:
- `NUMBER_OF_VEHICLES` (default 15000)
- `NUMBER_OF_TRANSACTIONS` (default 50000)
- `NUMBER_OF_ALERTS` (default 8000)
- `NUMBER_OF_CASES` (default 5000)
- `NUMBER_OF_EVIDENCE` (default 20000)
- `NUMBER_OF_NOTIFICATIONS` (default 15000)
- `NUMBER_OF_SEARCH_HISTORY` (default 10000)

Chunking:
- `CHUNK_SIZE` (default 10000)

Run:
```bash
python main.py
```

Optional override:
```bash
python main.py --output-dir dataset_generator/output
```

## Import into PostgreSQL
Use `COPY` for fast loading. Example:

```sql
COPY vehicles(id, plate, make, model, color, is_blacklisted, fastag_id, created_at)
FROM 'path/to/vehicles.csv'
WITH (FORMAT csv, HEADER true);
```

Repeat for other tables.

