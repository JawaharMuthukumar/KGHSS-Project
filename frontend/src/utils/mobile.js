/**
 * Spread onto every mobile-number <input>. `data-mobile` lets useMobileInputGuard strip anything
 * that isn't a digit as it is typed or pasted (capped at 10); `pattern` blocks submitting fewer.
 * No maxLength on purpose: it would cut a pasted "+91 98765 43210" before the guard could clean it.
 */
export const mobileInputProps = {
  type: "tel",
  inputMode: "numeric",
  autoComplete: "tel",
  pattern: "[0-9]{10}",
  title: "Enter a 10-digit mobile number",
  "data-mobile": "true",
};

/** Digits only, at most 10; a pasted +91 / leading 0 prefix is dropped. */
export const toMobileDigits = (value) => {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.length > 10 && /^(91|0)/.test(digits)) digits = digits.slice(-10);
  return digits.slice(0, 10);
};
