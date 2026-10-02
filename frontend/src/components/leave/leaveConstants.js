export const STUDENT_LEAVE_TYPES = [
  { value: "normal", label: "Normal Leave", hint: "Counted as absent once your class teacher approves." },
  { value: "od", label: "On Duty (OD)", hint: "For school events, competitions etc. — you stay marked present." },
];

export const TEACHER_LEAVE_TYPES = [
  { value: "personal", label: "Personal Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "od", label: "On Duty (OD)" },
];

export const LEAVE_TYPE_LABELS = { normal: "Normal Leave", od: "On Duty (OD)", personal: "Personal Leave", sick: "Sick Leave" };

export const LEAVE_STATUS_TONE = { pending: "navy", approved: "success", rejected: "danger" };

// Mirrors the backend: only Mon–Fri count as leave days.
export function countWorkingDays(from, to) {
  if (!from || !to || to < from) return 0;
  let count = 0;
  for (let d = new Date(`${from}T00:00:00`); d <= new Date(`${to}T00:00:00`); d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count += 1;
  }
  return count;
}
