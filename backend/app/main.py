from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.groups import router as groups_router
from app.api.subjects import router as subjects_router
from app.api.promotions import router as promotions_router
from app.api.school import router as school_router
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.models import entities  # noqa: F401 - registers models with SQLAlchemy metadata
from app.models.entities import AcademicClass, OtherSubject, SubjectGroup
from app.services.mark_scheme import GROUP_SUBJECTS, HSC_PRACTICAL_SUBJECTS

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
app.include_router(promotions_router, prefix=settings.api_v1_prefix)
app.include_router(groups_router, prefix=settings.api_v1_prefix)
app.include_router(subjects_router, prefix=settings.api_v1_prefix)
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
        ("classes", "medium", "VARCHAR(20)"),
        ("classes", "strength", "INTEGER"),
        ("students", "father_phone", "VARCHAR(30)"),
        ("students", "mother_phone", "VARCHAR(30)"),
        ("students", "status", "VARCHAR(20)"),
        ("classes", "intake_open", "BOOLEAN"),
        ("accounts", "password_is_default", "BOOLEAN"),
    ]
    inspector = inspect(engine)
    for table, column, ddl_type in added_columns:
        if column not in {c["name"] for c in inspector.get_columns(table)}:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type} NULL"))
    # Students from before promotions existed are all current students.
    with engine.begin() as conn:
        conn.execute(text("UPDATE students SET status = 'active' WHERE status IS NULL"))
        conn.execute(text("UPDATE classes SET intake_open = TRUE WHERE intake_open IS NULL"))
        conn.execute(text("UPDATE accounts SET password_is_default = FALSE WHERE password_is_default IS NULL"))
    # A teacher may now be class teacher of several classes; drop the old one-class-per-teacher constraint.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE class_teacher_assignments DROP CONSTRAINT IF EXISTS class_teacher_assignments_teacher_id_academic_year_key"))

    # (code, grade, section, group, medium, sanctioned strength) — from the school's 2026-27 class list.
    # In higher secondary the section implies the group, and a "1" suffix marks the English-medium section.
    classes = [
        ("6A", 6, "A", None, "Tamil", 30), ("6B", 6, "B", None, "English", 50),
        ("7A", 7, "A", None, "Tamil", 26), ("7B", 7, "B", None, "English", 41),
        ("8A", 8, "A", None, "Tamil", 28), ("8B", 8, "B", None, "English", 44),
        ("9A", 9, "A", None, "Tamil", 50), ("9B", 9, "B", None, "English", 61),
        ("10A", 10, "A", None, "Tamil", 27), ("10B", 10, "B", None, "English", 49),
        ("11A", 11, "A", "P/C/M/CS", "Tamil", 19), ("11A1", 11, "A1", "P/C/M/CS", "English", 35),
        ("11B", 11, "B", "P/C/B/M", "Tamil", 34), ("11B1", 11, "B1", "P/C/B/M", "English", 19),
        ("12A", 12, "A", "P/C/M/CS", "Tamil", 15), ("12A1", 12, "A1", "P/C/M/CS", "English", 22),
        ("12B", 12, "B", "P/C/B/M", "Tamil", 10), ("12B1", 12, "B1", "P/C/B/M", "English", 13),
        ("12C", 12, "C", "P/C/B/CS", "Tamil", 25), ("12C1", 12, "C1", "P/C/B/CS", "English", 20),
    ]
    # Earlier higher-secondary codes are renamed in place (keeping their ids) to the matching class.
    # If that class already exists, an unused old row (e.g. re-seeded by an older deploy) is dropped.
    legacy_renames = {
        "11G1": "11B", "11G2": "11A", "12G1": "12B", "12G2": "12A",
        "11PCMCS-A1": "11A", "11PCMCS-A2": "11A1", "11PCBM-A1": "11B", "11PCBM-A2": "11B1",
        "12PCMCS-A1": "12A", "12PCMCS-A2": "12A1", "12PCBM-A1": "12B", "12PCBM-A2": "12B1",
        "12PCBCS-A1": "12C", "12PCBCS-A2": "12C1",
    }
    class_ref_tables = ["students", "assessments", "attendance_months", "notices", "class_teacher_assignments",
                        "subject_teacher_assignments", "timetable_entries", "leave_requests"]
    seed = {c[0]: c[1:] for c in classes}
    from app.core.database import SessionLocal
    with SessionLocal() as db:
        for old_code, new_code in legacy_renames.items():
            legacy = db.query(AcademicClass).filter_by(code=old_code).first()
            if not legacy:
                continue
            if not db.query(AcademicClass).filter_by(code=new_code).first():
                legacy.code = new_code
                legacy.grade, legacy.section, legacy.group_name = seed[new_code][:3]
                db.flush()
            elif not any(db.execute(text(f"SELECT 1 FROM {t} WHERE class_id = :id LIMIT 1"), {"id": legacy.id}).first()
                         for t in class_ref_tables):
                db.delete(legacy)
                db.flush()
        for code, (grade, section, group_name, medium, strength) in seed.items():
            cls = db.query(AcademicClass).filter_by(code=code).first()
            if not cls:
                db.add(AcademicClass(code=code, grade=grade, section=section, group_name=group_name,
                                     medium=medium, strength=strength, academic_year="2026-2027"))
                continue
            # Only fill blanks, so later edits made in the portal are not overwritten on restart.
            if cls.medium is None: cls.medium = medium
            if cls.strength is None: cls.strength = strength
        # The school's original groups; the HM adds more from the Promotions page. Existing rows are never overwritten.
        for letter, name in (("A", "P/C/M/CS"), ("B", "P/C/B/M"), ("C", "P/C/B/CS")):
            if not db.query(SubjectGroup).filter((SubjectGroup.name == name) | (SubjectGroup.letter == letter)).first():
                db.add(SubjectGroup(name=name, letter=letter, subjects=[{"subject": s, "practical": s in HSC_PRACTICAL_SUBJECTS} for s in GROUP_SUBJECTS[name]]))
        # Non-exam periods the timetable always offered; the HM adds more (e.g. Physical Education) from Teachers.
        if not db.query(OtherSubject).first():
            db.add_all(OtherSubject(name=n) for n in ("PET", "Library", "Value Education", "Lab", "Drawing", "Yoga"))
        db.commit()


@app.get("/", tags=["System"])
def root():
    return {"name": settings.app_name, "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["System"])
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
