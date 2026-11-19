"""Certificate PDFs on the school's letterhead (school logo + Government of Tamil Nadu logo).

The bonafide certificate copies the school's printed form (SCHOOL BONAFIDE CERTIFICATE) with the
blanks filled in from the student's record; other certificate types reuse the same letterhead.
"""
from datetime import datetime
from functools import lru_cache
from html import escape
from io import BytesIO
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from app.models.entities import Student

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SCHOOL_LOGO = ASSETS / "school-logo.png"
TN_LOGO = ASSETS / "tn-govt-logo.png"
NAVY = HexColor("#2B2A7D")  # the school logo's blue
GREY = HexColor("#8A8A8A")
ROMAN = {6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"}
PAGE_W, PAGE_H = A4
MARGIN = 55


@lru_cache
def _logo(path: Path) -> ImageReader:
    return ImageReader(str(path))


@lru_cache
def _watermark() -> ImageReader:
    """The school logo faded towards white, like the printed form's background seal."""
    logo = Image.open(SCHOOL_LOGO).convert("RGBA")
    white = Image.new("RGBA", logo.size, (255, 255, 255, 255))
    faded = Image.blend(white, Image.alpha_composite(white, logo), 0.13)
    faded.putalpha(logo.getchannel("A"))
    buf = BytesIO(); faded.save(buf, "PNG"); buf.seek(0)
    return ImageReader(buf)


def _letterhead(pdf: canvas.Canvas) -> None:
    """Logos, the HEAD MASTER address block, the watermark and the bottom bar."""
    top = PAGE_H - 40
    pdf.drawImage(_logo(SCHOOL_LOGO), 40, top - 92, 92, 92, mask="auto", preserveAspectRatio=True)
    pdf.drawImage(_logo(TN_LOGO), PAGE_W - 40 - 88, top - 92, 88, 92, mask="auto", preserveAspectRatio=True)
    x = 145
    pdf.setFillColor(black)
    pdf.setFont("Helvetica-Bold", 13); pdf.drawString(x, top - 32, "HEAD MASTER")
    pdf.setFont("Helvetica-Bold", 13.5); pdf.drawString(x, top - 50, "GOVERNMENT HIGHER SECONDARY SCHOOL")
    pdf.setFont("Helvetica", 9.5); line = "KANGAYAMPALAYAM, COIMBATORE - 641401"
    pdf.drawString(x, top - 66, line)

    size = 340
    pdf.drawImage(_watermark(), (PAGE_W - size) / 2, PAGE_H / 2 - size / 2 + 40, size, size, mask="auto", preserveAspectRatio=True)

    bar_y, bar_h, split = 34, 9, PAGE_W * 0.52
    pdf.setFillColor(NAVY); pdf.rect(0, bar_y, split, bar_h, stroke=0, fill=1)
    pdf.setFillColor(GREY); pdf.rect(split, bar_y, PAGE_W - split, bar_h, stroke=0, fill=1)
    pdf.setFillColor(black)


def _title(pdf: canvas.Canvas, text: str, y: float) -> None:
    pdf.setFont("Times-Bold", 19)
    pdf.drawCentredString(PAGE_W / 2, y, text)
    w = pdf.stringWidth(text, "Times-Bold", 19)
    pdf.setLineWidth(1.1); pdf.line((PAGE_W - w) / 2, y - 4, (PAGE_W + w) / 2, y - 4)


def _signature(pdf: canvas.Canvas, issued: datetime | None, y: float = 250) -> None:
    pdf.setFont("Times-Roman", 13.5)
    pdf.drawString(MARGIN, y, "PLACE  : KANGAYAMPALAYAM")
    pdf.drawString(MARGIN, y - 26, "DATE    :  " + (issued or datetime.utcnow()).strftime("%d-%m-%Y"))
    pdf.setFont("Times-Bold", 13.5); pdf.drawRightString(PAGE_W - MARGIN, y, "HEAD MASTER")


def _fill(value: str | None, blank: int = 22) -> str:
    """A filled-in blank: bold and underlined, or an empty line when the record has no value."""
    if value and value.strip():
        # Non-breaking inside too, so a name never splits across two lines.
        return f"<u><b>&nbsp;{escape(' '.join(value.split())).replace(' ', '&nbsp;')}&nbsp;</b></u>"
    return "_" * blank


def _gendered(gender: str | None, male: str, female: str, either: str) -> str:
    g = (gender or "").strip().lower()
    return male if g == "male" else female if g == "female" else either


def _body_style(**kw) -> ParagraphStyle:
    return ParagraphStyle("body", **{"fontName": "Times-Roman", "fontSize": 15, "leading": 31, "alignment": TA_JUSTIFY, **kw})


def _draw_para(pdf: canvas.Canvas, text: str, y_top: float, style: ParagraphStyle) -> float:
    """Draw a paragraph whose top edge sits at y_top; returns the y just below it."""
    para = Paragraph(text, style)
    _, h = para.wrap(PAGE_W - 2 * MARGIN, PAGE_H)
    para.drawOn(pdf, MARGIN, y_top - h)
    return y_top - h


def bonafide_pdf(student: Student, issued: datetime | None) -> BytesIO:
    cls = student.school_class
    output = BytesIO(); pdf = canvas.Canvas(output, pagesize=A4)
    pdf.setTitle("School Bonafide Certificate")
    _letterhead(pdf)
    _title(pdf, "SCHOOL BONAFIDE CERTIFICATE", PAGE_H - 215)

    g = student.gender
    # Father's name when the record has it, otherwise the mother's.
    parent = (student.father_name or "").strip() or (student.mother_name or "").strip() or None
    # S/O · D/O always starts the second line, together with the parent's name.
    text = (f"This is to certify that {_gendered(g, 'Selvan', 'Selvi', 'Selvi/Selvan')} {_fill(student.account.full_name)}<br/>"
            f"{_gendered(g, 'S/O', 'D/O', 'D/o /S/O')} {_fill(parent)} studying in {_fill(ROMAN.get(cls.grade, str(cls.grade)), 5)} Standard "
            f"{_fill(cls.section, 4)} Sec in the academic year {escape(cls.academic_year)} in our institution.")
    y = _draw_para(pdf, text, PAGE_H - 255, _body_style(firstLineIndent=85))

    dob = student.date_of_birth.strftime("%d-%m-%Y") if student.date_of_birth else None
    y = _draw_para(pdf, f"{_gendered(g, 'His', 'Her', 'His/ Her')} date of Birth as per our record is: {_fill(dob, 16)}", y - 22, _body_style())

    pdf.setFont("Times-Roman", 15); pdf.drawString(MARGIN, y - 50, "PRESENT ADDRESS")
    pdf.setLineWidth(0.8); pdf.line(MARGIN, y - 53, MARGIN + pdf.stringWidth("PRESENT ADDRESS", "Times-Roman", 15), y - 53)
    if student.address:
        address = "<br/>".join(escape(line.strip()) for line in student.address.splitlines() if line.strip())
        _draw_para(pdf, address, y - 64, _body_style(leading=22, alignment=0, rightIndent=180))

    _signature(pdf, issued)
    pdf.save(); output.seek(0)
    return output


def general_certificate_pdf(student: Student, certificate_type: str, issued: datetime | None) -> BytesIO:
    """Attendance / conduct certificates: same letterhead, short statement."""
    cls = student.school_class
    output = BytesIO(); pdf = canvas.Canvas(output, pagesize=A4)
    pdf.setTitle(f"{certificate_type.title()} Certificate")
    _letterhead(pdf)
    _title(pdf, f"{certificate_type.upper()} CERTIFICATE", PAGE_H - 215)
    text = (f"This is to certify that {_fill(student.account.full_name)} (Reg. No {_fill(student.registration_no, 10)}) "
            f"is studying in {_fill(ROMAN.get(cls.grade, str(cls.grade)), 5)} Standard {_fill(cls.section, 4)} Sec "
            f"in the academic year {escape(cls.academic_year)} in our institution. This certificate is issued on request.")
    _draw_para(pdf, text, PAGE_H - 255, _body_style(firstLineIndent=85))
    _signature(pdf, issued)
    pdf.save(); output.seek(0)
    return output
