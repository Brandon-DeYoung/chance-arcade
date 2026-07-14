export type StorageResult<T> = { value: T | null; error: string | null };

export function readLocalJson<T>(key: string): StorageResult<T> {
  try {
    const raw = window.localStorage.getItem(key);
    return { value: raw ? JSON.parse(raw) as T : null, error: null };
  } catch {
    return {
      value: null,
      error: "Browser storage is unavailable. Changes will work for this session but will not survive a refresh.",
    };
  }
}

export function writeLocalJson(key: string, value: unknown): string | null {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch {
    return "Browser storage is unavailable. Export your roster or level before closing this tab.";
  }
}
