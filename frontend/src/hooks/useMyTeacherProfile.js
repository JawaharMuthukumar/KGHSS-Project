import { useEffect, useState } from "react";
import { useApiResource } from "./useApiResource";

const STORAGE_KEY = "kghss.teacherClass";
const CHANGE_EVENT = "kghss:teacher-class-change";

function readStoredClass() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Switch which of the teacher's classes every teacher page works on. */
export function selectTeacherClass(code) {
  try {
    sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage blocked: the selection still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: code }));
}

/**
 * Shared lookup of the signed-in teacher's class-teacher scope. A teacher may be Class Teacher of
 * several classes; `classCode` is the one currently selected (null if they have none).
 */
export function useMyTeacherProfile() {
  const [selected, setSelected] = useState(readStoredClass);

  useEffect(() => {
    const onChange = (e) => setSelected(e.detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  // The API falls back to the teacher's first class when the stored code isn't one of theirs.
  const { data, loading, error } = useApiResource("/dashboards/teacher", {
    query: selected ? { class_code: selected } : undefined,
    deps: [selected],
  });

  return { profile: data, loading, error, classCode: data?.class_code || null, classes: data?.classes || [] };
}
