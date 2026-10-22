import { useEffect } from "react";

// Login IDs, numbers, contact details and codes must be saved exactly as typed.
const SKIP_FIELD = /user|login|password|email|phone|mobile|employee|admission|regist|emis|umis|code|url|link|blood/i;
const NAME_FIELD = /name/i;

const nativeSetters = {
  INPUT: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set,
  TEXTAREA: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set,
};

export const capitalizeWords = (value) => value.replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
export const capitalizeFirst = (value) => value.replace(/^(\s*)(\S)/, (_, space, letter) => space + letter.toUpperCase());

function modeFor(el) {
  if (el.tagName === "INPUT" && el.type !== "text") return null;
  if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return null;
  const explicit = el.dataset.capitalize; // "words" | "first" | "off"
  if (explicit) return explicit === "off" ? null : explicit;
  if (["numeric", "decimal", "tel", "email", "url"].includes(el.inputMode)) return null;
  const key = `${el.name || ""} ${el.id || ""}`;
  const placeholder = el.placeholder || "";
  if (SKIP_FIELD.test(key) || /^search/i.test(placeholder) || el.getAttribute("role") === "combobox") return null;
  return NAME_FIELD.test(key) || NAME_FIELD.test(placeholder) ? "words" : "first";
}

/**
 * While mounted, capitalises what is typed into the page's text boxes: every word for name fields,
 * the first letter for everything else. Runs before React's onChange (capture phase on document) and
 * writes through the native value setter so controlled inputs pick up the corrected value.
 * Opt a field out with data-capitalize="off", or force a mode with data-capitalize="words" | "first".
 */
export function useAutoCapitalize(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onInput = (e) => {
      const el = e.target;
      if (e.isComposing || !el || !el.value) return;
      const mode = modeFor(el);
      if (!mode) return;
      const next = mode === "words" ? capitalizeWords(el.value) : capitalizeFirst(el.value);
      if (next === el.value) return;
      const { selectionStart, selectionEnd } = el;
      nativeSetters[el.tagName].call(el, next);
      el.setSelectionRange(selectionStart, selectionEnd);
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, [enabled]);
}
