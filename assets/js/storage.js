import { CONFIG } from "./config.js";

export function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveState(patch) {
  const current = loadState();
  const next = { ...current, ...patch };
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(next));
  } catch {
    // If storage fails, we just skip persistence.
  }
}
export function incrementView(id){
  const key = `views:${id}`;
  const v = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, v + 1);
}

export function getViews(id){
  return parseInt(localStorage.getItem(`views:${id}`) || "0", 10);
}
