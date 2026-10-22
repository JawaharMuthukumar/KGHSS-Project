import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../ui/Icon";

/**
 * Text box + dropdown: shows matching subjects as soon as a letter is typed (or the full list on
 * focus / arrow click). Free text is still allowed for one-off periods. The list is portalled to
 * <body> with position:fixed, so no scroll container or transformed ancestor can clip or shift it.
 */
export default function SubjectCombobox({ id, value, onChange, options, placeholder = "Subject", className = "" }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // The fixed-position list would drift away from its box on scroll, so just close it.
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e?.target instanceof Node && listRef.current?.contains(e.target)) return; // scrolling the list itself
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const q = (value || "").trim().toLowerCase();
  const exact = options.some((o) => o.toLowerCase() === q);
  const matches = !q || exact ? options : options.filter((o) => o.toLowerCase().includes(q));
  // Options starting with what was typed come first.
  const list = [...matches].sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)));

  const openList = () => {
    setRect(inputRef.current?.getBoundingClientRect() || null);
    setHighlight(0);
    setOpen(true);
  };

  const choose = (option) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + list.length) % Math.max(list.length, 1));
    } else if (e.key === "Enter" && open && list[highlight]) {
      e.preventDefault();
      choose(list[highlight]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    setOpen(false);
    // Snap a case-insensitive match onto the canonical spelling ("maths" → "Maths").
    const canonical = options.find((o) => o.toLowerCase() === q);
    if (canonical && canonical !== value) onChange(canonical);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        data-capitalize="first"
        placeholder={placeholder}
        value={value}
        onFocus={openList}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) openList();
          setHighlight(0);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} pr-7`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show subjects"
        onMouseDown={(e) => {
          e.preventDefault();
          if (open) setOpen(false);
          else {
            inputRef.current?.focus();
            openList();
          }
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy"
      >
        <Icon name="ChevronDown" size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && rect && list.length > 0 && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, minWidth: Math.max(rect.width, 160) }}
          className="z-[200] max-h-56 overflow-y-auto bg-white border border-navy/10 rounded-xl shadow-lg py-1 text-left"
        >
          {list.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${
                i === highlight ? "bg-navy/[0.06]" : ""
              } ${option === value ? "font-semibold text-navy" : "text-navy/80"}`}
            >
              {option}
              {option === value && <Icon name="Check" size={13} className="text-gold" />}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
