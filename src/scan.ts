import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Usage = { flag: string; file: string; line: number; config: boolean };

// Matches isEnabled("x"), hasFeature('x'), getValue("x"), getFeatureValue(`x`) ...
const CALL = /\b(isEnabled|hasFeature|getValue|getFeatureValue|get_feature_value|is_feature_enabled|get_value)\s*\(\s*["'`]([\w.\-]+)["'`]/g;
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next"]);
const EXT = /\.(?:[cm]?[jt]sx?|py|go|java|rb|php|vue|svelte)$/;

export function scanSource(src: string, file = "<mem>"): Usage[] {
  const out: Usage[] = [];
  for (const m of src.matchAll(CALL)) {
    const line = src.slice(0, m.index).split("\n").length;
    out.push({ flag: m[2], file, line, config: /value/i.test(m[1]) });
  }
  return out;
}

export function scanDir(dir: string): Usage[] {
  const out: Usage[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...scanDir(p));
    else if (EXT.test(name)) out.push(...scanSource(readFileSync(p, "utf8"), p));
  }
  return out;
}
