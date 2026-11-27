"""HM approval stamp on a Notes of Lessons PDF: signature, APPROVED, Head Master and the date/time, in a white box
at the bottom-right of the last page (white so it stays readable even over the page's own text)."""
from datetime import datetime
from io import BytesIO

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.services.signature_ink import ink

INK = HexColor("#102048")
GREEN = HexColor("#0a7a2f")
BOX_W, BOX_H, MARGIN = 190, 92, 40
BOTTOM = 62  # clears a typical page footer (page number line)


def stamp_approval(pdf: bytes, signature_png: str, approved_at: datetime, approver: str = "Head Master") -> bytes:
    """Return the PDF with the approval stamp drawn on its last page. `signature_png` is a PNG data URL."""
    reader = PdfReader(BytesIO(pdf))
    writer = PdfWriter(clone_from=reader)
    page = writer.pages[-1]
    box = page.cropbox
    left, bottom = float(box.left), float(box.bottom)
    width, height = float(box.width), float(box.height)

    overlay = BytesIO()
    c = canvas.Canvas(overlay, pagesize=(float(page.mediabox.width), float(page.mediabox.height)))
    x = left + width - BOX_W - MARGIN
    y = bottom + BOTTOM
    c.setFillColor(white); c.setStrokeColor(GREEN); c.setLineWidth(1.2)
    c.roundRect(x, y, BOX_W, BOX_H, 6, stroke=1, fill=1)
    sig = ImageReader(ink(signature_png))  # HM signs in green ink
    c.drawImage(sig, x + 10, y + BOX_H - 46, BOX_W - 20, 38, mask="auto", preserveAspectRatio=True, anchor="c")
    c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(x + BOX_W / 2, y + 30, "APPROVED")
    c.setFillColor(INK); c.setFont("Helvetica", 7.5)
    c.drawCentredString(x + BOX_W / 2, y + 19, f"{approver}, GHSS Kangayampalayam")
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + BOX_W / 2, y + 8, approved_at.strftime("%d %b %Y, %I:%M %p"))
    c.save()
    page.merge_page(PdfReader(BytesIO(overlay.getvalue())).pages[0])
    out = BytesIO(); writer.write(out)
    return out.getvalue()
