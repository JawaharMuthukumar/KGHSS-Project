import { api } from "./apiClient";

/** Save a Blob as a file on the user's device. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download a CSV (or any file) from the API with the signed-in user's token. */
export async function downloadFile(path, { query, filename } = {}) {
  const blob = await api.getBlob(path, { query });
  saveBlob(blob, filename || path.split("/").pop());
}
