#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { compare, type Finding } from "./compare.js";
import { fetchFlags } from "./flagsmith.js";
import { fixSource } from "./fix.js";
import { scanDir } from "./scan.js";

if (existsSync(".env")) for (const l of readFileSync(".env", "utf8").split("\n")) { const m = l.match(/^(\w+)=(.*)$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const { FLAGSMITH_URL = "http://localhost:8000", FLAGSMITH_TOKEN, FLAGSMITH_PROJECT_ID, FLAGSMITH_ENV_KEY } = process.env;
if (!FLAGSMITH_TOKEN || !FLAGSMITH_PROJECT_ID || !FLAGSMITH_ENV_KEY) { console.error("Set FLAGSMITH_TOKEN, FLAGSMITH_PROJECT_ID, FLAGSMITH_ENV_KEY (see .env)"); process.exit(2); }

const dir = process.argv[3] ?? ".";
const findings = compare(scanDir(dir), await fetchFlags(FLAGSMITH_URL, FLAGSMITH_TOKEN, FLAGSMITH_PROJECT_ID, FLAGSMITH_ENV_KEY));

if (process.argv[2] === "fix") {
  const state = new Map(findings.filter((f) => f.kind.startsWith("remove-")).map((f) => [f.flag, f.kind === "remove-on"] as const));
  const files = new Set(findings.flatMap((f) => (state.has(f.flag) ? f.uses.map((u) => u.file) : [])));
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = fixSource(before, state);
    if (after !== before) { writeFileSync(file, after); console.log(`fixed ${file}`); }
  }
  console.log(`removed: ${[...state.keys()].join(", ") || "nothing"}`);
  process.exit(0);
}

const META: Record<string, [string, string]> = {
  "remove-on": ["🗑", "ON everywhere - safe to remove, keep the 'on' branch"],
  "remove-off": ["🗑", "OFF everywhere - safe to remove, keep the 'else' branch"],
  ghost: ["👻", "used in code but missing in Flagsmith (silently returns default!)"],
  unused: ["💤", "exists in Flagsmith but no code uses it"],
  live: ["✅", "config value in use - keep"],
};
const where = (f: Finding) => f.uses.map((u) => `${u.file}:${u.line}`).join(", ");
for (const f of findings) console.log(`${META[f.kind][0]} ${f.flag.padEnd(22)} ${META[f.kind][1]}${f.uses.length ? `\n     ${where(f)}` : ""}`);

const color = { "remove-on": "#16a34a", "remove-off": "#16a34a", ghost: "#dc2626", unused: "#ca8a04", live: "#888" } as const;
writeFileSync("sweeper-report.html", `<!doctype html><meta charset=utf-8><title>Flag Sweeper</title><body style="font:15px system-ui;max-width:860px;margin:40px auto"><h1>Flag Sweeper report</h1><table cellpadding=8 border=1 style="border-collapse:collapse;width:100%">${findings.map((f) => `<tr><td><b>${f.flag}</b></td><td style="color:${color[f.kind]}">${META[f.kind][0]} ${META[f.kind][1]}</td><td><code>${where(f)}</code></td></tr>`).join("")}</table>`);
console.log("\nwrote sweeper-report.html");
