import { useEffect } from "react";
import { toMobileDigits } from "../utils/mobile";

const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

/**
 * App-wide: inputs marked `data-mobile` (see mobileInputProps) only ever hold up to 10 digits.
 * Runs in the capture phase before React's onChange and writes through the native setter, so
 * controlled inputs receive the cleaned value — same technique as useAutoCapitalize.
 */
export function useMobileInputGuard() {
  useEffect(() => {
    const onInput = (e) => {
      const el = e.target;
      if (el?.tagName !== "INPUT" || el.dataset.mobile !== "true") return;
      const next = toMobileDigits(el.value);
      if (next !== el.value) nativeValueSetter.call(el, next);
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);
}
