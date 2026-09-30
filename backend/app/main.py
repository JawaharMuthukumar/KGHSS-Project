from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.school import router as school_router
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.models import entities  # noqa: F401 - registers models with SQLAlchemy metadata
from app.models.entities import AcademicClass

app = FastAPI(
    title=settings.app_name,
    description="GHSS Kangayampalayam public site and school portal API. Use Authorize with a Bearer JWT for protected operations.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Vite picks the next free port when 5173 is busy; allow any localhost port in dev
    # rather than chasing the exact port in CORS_ORIGINS every time.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(school_router, prefix=settings.api_v1_prefix)
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")


@app.on_event("startup")
def initialize_schema_and_reference_classes():
    """Create initial local schema and seed the mockup's class list.

    Use Alembic migrations instead of create_all once deployment/migration history is established.
    """
    Base.metadata.create_all(bind=engine)
    classes = [
        ("6A", 6, "A", None), ("6B", 6, "B", None), ("7A", 7, "A", None), ("7B", 7, "B", None),
        ("8A", 8, "A", None), ("8B", 8, "B", None), ("9A", 9, "A", None), ("9B", 9, "B", None),
        ("10A", 10, "A", None), ("10B", 10, "B", None), ("11G1", 11, "Group I", "Bio-Maths"),
        ("11G2", 11, "Group II", "Computer Science"), ("12G1", 12, "Group I", "Bio-Maths"),
        ("12G2", 12, "Group II", "Computer Science"),
    ]
    from app.core.database import SessionLocal
    with SessionLocal() as db:
        for code, grade, section, group_name in classes:
            if not db.query(AcademicClass).filter_by(code=code).first():
                db.add(AcademicClass(code=code, grade=grade, section=section, group_name=group_name, academic_year="2026-2027"))
        db.commit()


@app.get("/", tags=["System"])
def root():
    return {"name": settings.app_name, "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["System"])
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
