export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s/.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSetRatio(a: string, b: string): number {
  const sa = new Set(normalizeText(a).split(" ").filter(Boolean));
  const sb = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (!sa.size && !sb.size) return 1;
  const inter = [...sa].filter((x) => sb.has(x)).length;
  return (2 * inter) / (sa.size + sb.size || 1);
}

export function normalizeFrequency(v: string): string {
  const m = normalizeText(v);
  if (m === "bid") return "twice daily";
  if (m === "qd" || m === "daily") return "daily";
  return m;
}

export function normalizeDose(v: string): string {
  return normalizeText(v).replace(/\s+/g, "");
}
