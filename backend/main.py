# main.py
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker
# NOTE:
# main.py is intended to be executed as a module: `python -m uvicorn backend.main:app`.
# In some environments uvicorn may import it without package context, so we
# support both relative and absolute imports.
try:
    from .db.database import engine, Base, DATABASE_URL
    from .db import models  # noqa: F401 - register SQLAlchemy models before create_all()
    from .db import alert_enterprise_models  # noqa: F401
    from .routers import dashboard, alerts, vehicle, live, fraud, maps, reports, health, investigation, search, notifications, alert_quick_actions, admin
    from .routers.enterprise_auth import router as enterprise_auth_router
    from .routers.settings import profile as settings_profile
    from .routers.settings import preferences as settings_preferences


except ImportError:  # pragma: no cover
    from backend.db.database import engine, Base, DATABASE_URL
    from backend.db import models  # noqa: F401
    from backend.db import alert_enterprise_models  # noqa: F401
    from backend.routers import dashboard, alerts, vehicle, live, fraud, maps, reports, health, investigation, search, alert_quick_actions, admin
    from backend.routers.enterprise_auth import router as enterprise_auth_router
    from backend.routers.settings import profile as settings_profile
    from backend.routers.settings import preferences as settings_preferences


# Fallback auto-creation of tables

print("Initializing database tables...")
active_database = "PostgreSQL"
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"PostgreSQL initialization failed: {e}")
    print("Falling back to SQLite local database for runtime testing...")

    # Override engine to SQLite
    from sqlalchemy import create_engine

    sqlite_url = "sqlite:///./toll_db.db"
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

    # SQLite doesn't support Postgres JSONB types.
    # For local runtime imports/tests, skip schema creation for enterprise models.

    # Patch the session generator + engine used by Base.metadata.create_all()
    import backend.db.database as db_database

    db_database.engine = sqlite_engine
    db_database.SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=sqlite_engine
    )

    # Also patch the local `engine` symbol imported at module import time
    engine = sqlite_engine

    try:
        Base.metadata.create_all(bind=sqlite_engine)
        print("SQLite fallback tables created successfully.")
    except Exception as create_exc:
        print(f"SQLite fallback table creation failed: {create_exc}")

    active_database = "SQLite Fallback"
    print("SQLite fallback database selected.")


app = FastAPI(
    title="Toll Detection API Backend",
    description="Backend service loading custom Kaggle-trained YOLOv11 model & EasyOCR plate extraction.",
    version="1.0",
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing. Replace with frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(dashboard.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(alert_quick_actions.router, prefix="/api")
app.include_router(vehicle.router, prefix="/api")
app.include_router(live.router)  # WebSocket ws/live is mounted at root
app.include_router(fraud.router, prefix="/api")
app.include_router(maps.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(investigation.router, prefix="/api")

# Auth + Settings (Enterprise)
app.include_router(enterprise_auth_router, prefix="/api")
app.include_router(settings_profile.router, prefix="/api")
app.include_router(settings_preferences.router, prefix="/api")

# Admin endpoints
app.include_router(admin.router, prefix="/api")



@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Toll Detection Backend Server is running.",
        "database": active_database,
    }


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

