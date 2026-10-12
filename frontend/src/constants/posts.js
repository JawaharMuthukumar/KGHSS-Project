// Public pages a post can be published to — keys must match POST_PAGES in the backend.
export const POST_PAGES = [
  { key: "achievements", label: "Achievements" },
  { key: "results", label: "Results" },
  { key: "sports", label: "Sports" },
  { key: "school-life", label: "School Life" },
  { key: "events", label: "Events" },
];

export const MAX_POST_IMAGES = 6;

// Classes a Results post can be for, highest first — values must match RESULT_CLASSES in the backend.
export const RESULT_CLASSES = ["12", "11", "10", "9", "8", "7", "6"].map((value) => ({ value, label: `${value}th Std` }));

export const resultClassLabel = (value) => (value ? `${value}th Std` : "");

/** "priya m" -> "Priya M": upper-cases the first letter of every word, keeping spaces as typed. */
export const capitalizeWords = (value) => value.replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());

export const percentage = (obtained, total) => (total ? Math.round((obtained / total) * 1000) / 10 : 0);
