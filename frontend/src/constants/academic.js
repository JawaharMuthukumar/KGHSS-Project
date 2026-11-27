// Exam terms per grade band — mirrors backend app/services/mark_scheme.py.
export const TERMS_MIDDLE = ["1st Mid Term", "Quarterly", "2nd Mid Term", "Half Yearly", "3rd Mid Term", "Annual Exam"]; // 6th–9th
export const TERMS_SENIOR = ["1st Mid Term", "Quarterly", "2nd Mid Term", "Half Yearly", "3rd Mid Term", "Revision 1", "Revision 2", "Revision 3"];
// 10th uses TERMS_SENIOR; 11th–12th have no 3rd Mid Term.
export const TERMS_HSC = TERMS_SENIOR.filter((t) => t !== "3rd Mid Term");
export const ALL_EXAM_TERMS = [...new Set([...TERMS_MIDDLE, ...TERMS_SENIOR])];
export const termsForGrade = (grade) =>
  grade == null ? ALL_EXAM_TERMS : grade >= 11 ? TERMS_HSC : grade === 10 ? TERMS_SENIOR : TERMS_MIDDLE;
export const PASS_MARK = 35;
/** 11th–12th split exams pass on Theory alone: 15/70 (Physics, Chemistry, Biology, CS), 25/90 (Tamil, English, Maths).
 *  Practical and Internal are never pass/fail. null for every other mark. Mirrors backend mark_scheme.theory_pass_mark. */
export const theoryPassMark = (components) => {
  const c = components || {};
  return "theory" in c && "internal" in c ? ("practical" in c ? 15 : 25) : null;
};
/** Pass/fail for one subject mark: the Theory rule above, else 35% of the subject's maximum. */
export const markPassed = ({ score, max, absent, components }) => {
  if (absent || score == null) return false;
  const theoryPass = theoryPassMark(components);
  if (theoryPass != null) return (Number(components.theory) || 0) >= theoryPass;
  return score >= ((max ?? 100) * PASS_MARK) / 100;
};
export const DEFAULT_MAX_SCORE = 100;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A1+", "A1-", "A1B+", "A1B-"];
/** Maps free-text values saved earlier (e.g. "B+VE", "o -ve") onto BLOOD_GROUPS; unknown values are kept as-is. */
export const normalizeBloodGroup = (value) => {
  if (!value) return "";
  const v = value.toUpperCase().replace(/\s+/g, "").replace(/VE$/, "").replace(/POSITIVE$/, "+").replace(/NEGATIVE$/, "-");
  return BLOOD_GROUPS.includes(v) ? v : value;
};
