import type { Usage } from "./scan.js";

export type Flag = { name: string; enabled: boolean };
export type Finding = { flag: string; kind: "remove-on" | "remove-off" | "ghost" | "unused" | "live"; uses: Usage[] };

export function compare(usages: Usage[], flags: Flag[]): Finding[] {
  const byName = new Map<string, Usage[]>();
  for (const u of usages) byName.set(u.flag, [...(byName.get(u.flag) ?? []), u]);
  const known = new Map(flags.map((f) => [f.name, f]));
  const out: Finding[] = [];
  for (const [flag, uses] of byName) {
    const f = known.get(flag);
    // ponytail: "on/off in the one env we fetched" == stale; real staleness needs last-evaluated data
    out.push({ flag, uses, kind: !f ? "ghost" : uses.every((u) => u.config) ? "live" : f.enabled ? "remove-on" : "remove-off" });
  }
  for (const f of flags) if (!byName.has(f.name)) out.push({ flag: f.name, uses: [], kind: "unused" });
  return out;
}
