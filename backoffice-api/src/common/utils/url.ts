export type NormalizeHttpUrlOptions = {
  defaultScheme?: "http" | "https";
};

function stripWrappingQuotes(raw: string): string {
  const value = raw.trim();
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function shouldDefaultToHttp(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower === "localhost" || lower.startsWith("localhost:")) return true;
  if (lower.startsWith("127.") || lower.startsWith("0.0.0.0") || lower.startsWith("[::1]")) return true;
  if (lower.endsWith(".internal") || lower.includes(".internal:") || lower.includes("railway.internal")) return true;
  return false;
}

export function normalizeHttpUrl(raw: string, options: NormalizeHttpUrlOptions = {}): string {
  const value = stripWrappingQuotes(raw);
  if (!value) return value;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;

  const scheme = shouldDefaultToHttp(value) ? "http" : (options.defaultScheme ?? "https");
  return `${scheme}://${value}`;
}
