from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
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
    # create_all never alters existing tables, so add columns introduced after a table was first created.
    added_columns = [
        ("marks", "components", "JSON"),
        ("page_posts", "class_label", "VARCHAR(20)"),
        ("page_posts", "total_marks", "INTEGER"),
        ("page_post_images", "student_name", "VARCHAR(120)"),
        ("page_post_images", "obtained_marks", "DOUBLE PRECISION"),
    ]
    inspector = inspect(engine)
    for table, column, ddl_type in added_columns:
        if column not in {c["name"] for c in inspector.get_columns(table)}:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type} NULL"))
    classes = [
        ("6A", 6, "A", None), ("6B", 6, "B", None), ("7A", 7, "A", None), ("7B", 7, "B", None),
        ("8A", 8, "A", None), ("8B", 8, "B", None), ("9A", 9, "A", None), ("9B", 9, "B", None),
        ("10A", 10, "A", None), ("10B", 10, "B", None),
        # Higher secondary: one class per group (subject combination) and section.
        ("11PCBM-A1", 11, "A1", "P/C/B/M"), ("11PCBM-A2", 11, "A2", "P/C/B/M"),
        ("11PCMCS-A1", 11, "A1", "P/C/M/CS"), ("11PCMCS-A2", 11, "A2", "P/C/M/CS"),
        ("12PCMCS-A1", 12, "A1", "P/C/M/CS"), ("12PCMCS-A2", 12, "A2", "P/C/M/CS"),
        ("12PCBM-A1", 12, "A1", "P/C/B/M"), ("12PCBM-A2", 12, "A2", "P/C/B/M"),
        ("12PCBCS-A1", 12, "A1", "P/C/B/CS"), ("12PCBCS-A2", 12, "A2", "P/C/B/CS"),
    ]
    # The original Group I/II classes are renamed in place (keeping their ids) to the matching new class.
    # If the new class already exists, an unused legacy row (e.g. re-seeded by an older deploy) is dropped.
    legacy_renames = {"11G1": "11PCBM-A1", "11G2": "11PCMCS-A1", "12G1": "12PCBM-A1", "12G2": "12PCMCS-A1"}
    class_ref_tables = ["students", "assessments", "attendance_months", "notices", "class_teacher_assignments",
                        "subject_teacher_assignments", "timetable_entries", "leave_requests"]
    seed = {code: (grade, section, group_name) for code, grade, section, group_name in classes}
    from app.core.database import SessionLocal
    with SessionLocal() as db:
        for old_code, new_code in legacy_renames.items():
            legacy = db.query(AcademicClass).filter_by(code=old_code).first()
            if not legacy:
                continue
            if not db.query(AcademicClass).filter_by(code=new_code).first():
                legacy.code = new_code
                legacy.grade, legacy.section, legacy.group_name = seed[new_code]
            elif not any(db.execute(text(f"SELECT 1 FROM {t} WHERE class_id = :id LIMIT 1"), {"id": legacy.id}).first()
                         for t in class_ref_tables):
                db.delete(legacy)
        db.flush()
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
