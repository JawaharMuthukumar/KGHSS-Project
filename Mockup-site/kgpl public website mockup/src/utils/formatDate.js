export function formatDate(isoDate, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", options);
}

export function formatDateParts(isoDate) {
  if (!isoDate) return { day: "--", month: "---" };
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "---" };
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
}
