export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function safeText(value) {
  // Defensive: always return a string; never return HTML
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

export function qs(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function setQs(name, value) {
  const url = new URL(window.location.href);
  if (value === null || value === undefined || value === "") {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  window.history.replaceState({}, "", url.toString());
}
