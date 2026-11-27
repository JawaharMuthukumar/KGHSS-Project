/** "YYYY-MM-DD" of a Date in the browser's (school's) local time. */
export const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Shift a "YYYY-MM-DD" day by n days. */
export const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

/** The next school day (Monday–Friday) after `day`: the default due date. */
export const nextSchoolDay = (day) => {
  let next = addDays(day, 1);
  while ([0, 6].includes(new Date(`${next}T00:00:00`).getDay())) next = addDays(next, 1);
  return next;
};

export const dayLabel = (day) => new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export const slotKey = (s) => `${s.class_code}|${s.subject}`;
