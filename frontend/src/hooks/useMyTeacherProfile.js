import { useApiResource } from "./useApiResource";

/** Shared lookup of the signed-in teacher's own class-teacher scope (null class_code if not assigned). */
export function useMyTeacherProfile() {
  const { data, loading, error } = useApiResource("/dashboards/teacher");
  return { profile: data, loading, error, classCode: data?.class_code || null };
}
