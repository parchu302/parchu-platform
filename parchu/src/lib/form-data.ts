// FormData.get puede devolver File o null; normalizamos a string.
export function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
