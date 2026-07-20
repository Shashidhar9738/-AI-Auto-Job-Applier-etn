/** Small runtime helpers with no browser-API dependencies. */

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A human-like randomized delay within [min, max]. Used between form actions so
 * the extension applies at a natural pace and respects portal rate limits —
 * this is politeness/throttling, not an attempt to defeat security controls.
 */
export function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const jitter = minMs + Math.random() * Math.max(0, maxMs - minMs);
  return sleep(Math.round(jitter));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Convert a stored data URL back into a File for re-upload to a portal. */
export function dataUrlToFile(dataUrl: string, name: string, mime: string): File {
  const [, base64] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export function formatDate(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
