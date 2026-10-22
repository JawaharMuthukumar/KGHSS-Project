// Exam terms per grade band — mirrors backend app/services/mark_scheme.py.
export const TERMS_MIDDLE = ["Term 1", "Quarterly", "Term 2", "Half Yearly", "Term 3", "Annual Exam"];
export const TERMS_SENIOR = ["1st Mid Term", "Quarterly", "2nd Mid Term", "Half Yearly", "Revision 1", "Revision 2", "Revision 3"];
export const ALL_EXAM_TERMS = [...new Set([...TERMS_MIDDLE, ...TERMS_SENIOR])];
export const termsForGrade = (grade) => (grade == null ? ALL_EXAM_TERMS : grade >= 10 ? TERMS_SENIOR : TERMS_MIDDLE);
export const PASS_MARK = 35;
export const DEFAULT_MAX_SCORE = 100;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A1+", "A1-", "A1B+", "A1B-"];
/** Maps free-text values saved earlier (e.g. "B+VE", "o -ve") onto BLOOD_GROUPS; unknown values are kept as-is. */
export const normalizeBloodGroup = (value) => {
  if (!value) return "";
  const v = value.toUpperCase().replace(/\s+/g, "").replace(/VE$/, "").replace(/POSITIVE$/, "+").replace(/NEGATIVE$/, "-");
  return BLOOD_GROUPS.includes(v) ? v : value;
};
