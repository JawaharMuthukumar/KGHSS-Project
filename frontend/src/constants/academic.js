// Exam terms per grade band — mirrors backend app/services/mark_scheme.py.
export const TERMS_MIDDLE = ["Term 1", "Quarterly", "Term 2", "Half Yearly", "Term 3", "Annual Exam"];
export const TERMS_SENIOR = ["1st Mid Term", "Quarterly", "2nd Mid Term", "Half Yearly", "Revision 1", "Revision 2", "Revision 3"];
export const ALL_EXAM_TERMS = [...new Set([...TERMS_MIDDLE, ...TERMS_SENIOR])];
export const termsForGrade = (grade) => (grade == null ? ALL_EXAM_TERMS : grade >= 10 ? TERMS_SENIOR : TERMS_MIDDLE);
export const PASS_MARK = 35;
export const DEFAULT_MAX_SCORE = 100;
