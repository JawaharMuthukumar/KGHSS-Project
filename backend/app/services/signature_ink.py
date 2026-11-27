"""Signature ink colour. The HM signs in green ink (as gazetted officers do), so the HM's signature is re-inked
green wherever it is printed — certificates and the Notes of Lessons approval stamp — whatever colour it was saved in."""
import base64
from io import BytesIO

from PIL import Image

HM_GREEN = (10, 122, 47)


def ink(signature_png: str, rgb: tuple[int, int, int] = HM_GREEN) -> BytesIO:
    """The signature (PNG data URL, transparent background) with every stroke recoloured, as PNG bytes."""
    img = Image.open(BytesIO(base64.b64decode(signature_png.split(",", 1)[1]))).convert("RGBA")
    solid = Image.new("RGBA", img.size, rgb + (255,))
    solid.putalpha(img.getchannel("A"))
    out = BytesIO(); solid.save(out, "PNG"); out.seek(0)
    return out
