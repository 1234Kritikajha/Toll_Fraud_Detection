import os
import pandas as pd
from sqlalchemy import create_engine, text
from tqdm import tqdm

import os
DB_URL = os.getenv("DATABASE_URL")

BASE_DIR = os.path.join("dataset_generator", "output")

CSV_TABLE_MAP = {
    "vehicles.csv": "vehicles",
    "transactions.csv": "transactions",
    "alerts.csv": "alerts",
    "cases.csv": "cases",
    "evidence.csv": "evidence",
    "plazas.csv": "plazas",
    "notifications.csv": "notifications",
    "search_history.csv": "search_history",
}

engine = create_engine(DB_URL)

def table_exists(table_name):
    query = f"""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '{table_name}'
    );
    """
    with engine.connect() as conn:
        return conn.execute(text(query)).scalar()

def import_csv(file_name, table_name):
    file_path = os.path.join(BASE_DIR, file_name)

    if not os.path.exists(file_path):
        print(f"[SKIP] {file_name} not found")
        return

    df = pd.read_csv(file_path)
    df = df.drop_duplicates()
    df = df.where(pd.notnull(df), None)

    records = df.to_dict(orient="records")

    print(f"\nImporting {file_name} -> {table_name} ({len(records)} rows)")

    with engine.begin() as conn:
        for i in tqdm(range(0, len(records), 1000)):
            batch = records[i:i+1000]

            keys = batch[0].keys()
            columns = ", ".join(keys)
            values = ", ".join([f":{k}" for k in keys])

            query = text(f"""
                INSERT INTO {table_name} ({columns})
                VALUES ({values})
                ON CONFLICT DO NOTHING
            """)

            conn.execute(query, batch)

def main():
    print("\n===== IMPORT STARTED =====\n")

    for file_name, table_name in CSV_TABLE_MAP.items():
        try:
            import_csv(file_name, table_name)
        except Exception as e:
            print(f"[ERROR] {file_name}: {e}")

    print("\n===== IMPORT COMPLETE =====\n")

if __name__ == "__main__":
    main()