from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic import EmailStr


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)
    class_code: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class TeacherCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    subject: str = Field(min_length=1, max_length=100)
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)


class TeacherUpdate(BaseModel):
    full_name: str | None = None
    subject: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    class_code: str
    password: str = Field(min_length=8, max_length=128)
    registration_no: str | None = None
    admission_no: str | None = None
    emis_no: str | None = None
    umis_no: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    community: str | None = None
    medium: str | None = None
    blood_group: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    guardian_phone: str | None = None
    address: str | None = None


class ClassIn(BaseModel):
    code: str = Field(min_length=2, max_length=12)
    grade: int = Field(ge=1, le=12)
    section: str = Field(min_length=1, max_length=40)
    group_name: str | None = None
    academic_year: str = Field(min_length=4, max_length=9)


class ClassTeacherIn(BaseModel):
    teacher_id: int


class SubjectTeacherIn(BaseModel):
    teacher_id: int
    subject: str


class MarksIn(BaseModel):
    academic_year: str = Field(min_length=4, max_length=9)
    students: dict[str, dict[str, dict[str, Any]]]


class AttendanceIn(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    total_days: int = Field(ge=1, le=31)
    records: dict[int, int]


class TimetableEntryIn(BaseModel):
    weekday: int = Field(ge=0, le=5)
    period: int = Field(ge=1, le=8)
    subject: str | None = None
    teacher_id: int | None = None
    class_code: str | None = None
    room: str | None = None


class TimetableIn(BaseModel):
    academic_year: str
    entries: list[TimetableEntryIn]


class NoticeIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=1)
    audience: str = "all"
    class_code: str | None = None


class NoticeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    audience: str | None = None
    class_code: str | None = None


class CertificateIn(BaseModel):
    certificate_type: str = Field(pattern=r"^(attendance|bonafide|conduct)$")
    note: str | None = None


class DecisionIn(BaseModel):
    approve: bool
    note: str | None = None


class ComplaintMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class EventIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    academic_year: str
    event_date: date | None = None
    is_published: bool = True


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    academic_year: str | None = None
    event_date: date | None = None
    is_published: bool | None = None


class GalleryIn(BaseModel):
    event_id: int | None = None
    title: str = Field(min_length=1, max_length=200)
    category: str = "General"
    media_type: str = "image"
    media_url: str = Field(min_length=1, max_length=1000)
    is_published: bool = True


class PublicContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=5, max_length=5000)


class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class HealthOut(BaseModel):
    status: str
    database: str
