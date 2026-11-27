import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import Banner from "./Banner";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

const INK = [16, 32, 72]; // dark navy ink, prints like a pen signature
const OUT_W = 600;
const OUT_H = 200;
// The pad and previews stay white like paper, even in portal dark mode, so the dark ink stays visible.
const PAPER = { background: "#ffffff" };

/**
 * Crop a signature to its ink and fit it into OUT_W × OUT_H on a transparent background.
 * `fromPhoto`: the canvas holds a photo — light paper becomes transparent and the strokes are re-inked;
 * otherwise it holds strokes drawn on a transparent canvas and only the crop/fit is needed.
 */
function cleanSignature(src, fromPhoto) {
  const { width: w, height: h } = src;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  if (fromPhoto) {
    // Paper brightness = a high percentile of the photo's luminance; anything clearly darker is ink.
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const sorted = Float32Array.from(lum).sort();
    const paper = sorted[Math.floor(sorted.length * 0.85)];
    const cut = paper * 0.72;
    for (let i = 0; i < w * h; i++) {
      const a = lum[i] >= cut ? 0 : Math.min(255, 70 + ((cut - lum[i]) / cut) * 400);
      d[i * 4] = INK[0]; d[i * 4 + 1] = INK[1]; d[i * 4 + 2] = INK[2]; d[i * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
  }

  // Bounding box of the ink
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 8;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const scale = Math.min(OUT_W / cw, OUT_H / ch, 2);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cw * scale));
  out.height = Math.max(1, Math.round(ch * scale));
  const octx = out.getContext("2d");
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** Signature pad: draw with a finger, stylus or mouse. */
function DrawPad({ onChange }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = `rgb(${INK.join(",")})`;
  }, []);

  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    e.preventDefault();
    canvas.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = canvas.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(cleanSignature(canvas.current, false));
  };
  const clear = () => {
    const c = canvas.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-navy/20" style={PAPER}>
        <canvas
          ref={canvas}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="block w-full h-44 touch-none cursor-crosshair"
          aria-label="Signature pad: sign here"
        />
        {empty && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-navy/30">Sign here</p>}
        <div className="pointer-events-none absolute left-6 right-6 bottom-10 border-b border-navy/15" />
      </div>
      <button type="button" onClick={clear} className="mt-2 text-xs font-semibold text-navy/60 hover:text-navy inline-flex items-center gap-1">
        <Icon name="RefreshCw" size={13} /> Clear
      </button>
    </div>
  );
}

/** Upload a photo of a signature on plain paper; the background is removed automatically. */
function UploadPad({ onChange, onError }) {
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("Choose a photo (JPG or PNG) of your signature.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const result = cleanSignature(c, true);
      if (!result) return onError("No signature found in the photo. Sign with a dark pen on white paper and try again.");
      onError("");
      onChange(result);
    };
    img.onerror = () => onError("Could not read that photo. Try another one.");
    img.src = url;
  };
  return (
    <label className="flex flex-col items-center justify-center gap-2 h-44 rounded-xl border-2 border-dashed border-navy/20 bg-white cursor-pointer hover:border-gold text-center px-4">
      <Icon name="Upload" size={22} className="text-navy/45" />
      <span className="text-sm font-semibold text-navy">Choose a photo of your signature</span>
      <span className="text-xs text-navy/50">Sign with a dark pen on plain white paper, then take a clear photo. The background is removed automatically.</span>
      <input type="file" accept="image/*" onChange={pick} className="sr-only" />
    </label>
  );
}

/** Teacher's own signature: draw it or upload a photo; used when they sign their class's report cards. */
export default function SignatureDialog({ open, onClose }) {
  const toast = useToast();
  const [current, setCurrent] = useState(undefined); // undefined = loading, null = none
  const [mode, setMode] = useState("draw");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(null);
    setError("");
    setCurrent(undefined);
    api.get("/me/signature").then((r) => setCurrent(r.image)).catch(() => setCurrent(null));
  }, [open]);

  if (!open) return null;

  const save = async () => {
    if (!draft) return setError(mode === "draw" ? "Sign in the box first." : "Choose a photo first.");
    setBusy(true);
    setError("");
    try {
      await api.put("/me/signature", { image: draft });
      toast.success("Signature saved. Sign your class's report cards from Reports → Report Cards.");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the signature. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete("/me/signature");
      setCurrent(null);
      toast.success("Signature removed. Report cards you signed no longer show it.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the signature.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sig-title">
      <button type="button" aria-label="Close" onClick={busy ? undefined : onClose} className="absolute inset-0 bg-navy-dark/50" />
      <div className="relative w-full max-w-lg max-h-[90svh] overflow-y-auto rounded-2xl bg-white shadow-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/15 text-gold-dark shrink-0">
            <Icon name="Pencil" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="sig-title" className="font-heading font-bold text-navy text-base">My Signature</h2>
            <p className="text-sm text-navy/60 mt-0.5">Shown in the class teacher sign column of report cards you sign.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-navy/45 hover:text-navy">
            <Icon name="X" size={20} />
          </button>
        </div>

        {current && (
          <div className="rounded-xl border border-navy/10 p-3">
            <p className="text-xs font-semibold text-navy/50 mb-2">Current signature</p>
            <div className="flex items-center gap-3">
              <img src={current} alt="Your current signature" className="h-14 max-w-[70%] object-contain rounded" style={PAPER} />
              <button type="button" onClick={remove} disabled={busy} className="ml-auto text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg">
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-navy/[0.05] rounded-full p-1 w-fit">
          {[
            { id: "draw", label: "Sign on screen", icon: "Pencil" },
            { id: "upload", label: "Upload photo", icon: "Upload" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setDraft(null);
                setError("");
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full ${mode === m.id ? "bg-navy text-white" : "text-navy/60"}`}
            >
              <Icon name={m.icon} size={13} /> {m.label}
            </button>
          ))}
        </div>

        {mode === "draw" ? <DrawPad key="draw" onChange={setDraft} /> : <UploadPad onChange={setDraft} onError={setError} />}

        {draft && (
          <div>
            <p className="text-xs font-semibold text-navy/50 mb-1">Preview (as it will print)</p>
            <div className="flex items-center justify-center h-20 rounded-xl border border-navy/10" style={PAPER}>
              <img src={draft} alt="New signature preview" className="max-h-16 max-w-[80%] object-contain" />
            </div>
          </div>
        )}

        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy || !draft}
            className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {busy ? "Saving…" : current ? "Replace signature" : "Save signature"}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-full text-sm font-semibold text-navy/60 hover:text-navy hover:bg-navy/5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
