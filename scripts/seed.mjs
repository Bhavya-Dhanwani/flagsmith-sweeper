// Seeds a LOCAL Flagsmith (docker compose) with a demo project + flags, writes creds/token to .env
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const BASE = process.env.FLAGSMITH_URL ?? "http://localhost:8000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("local only");

const env = existsSync(".env") ? Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s))) : {};
const email = env.FLAGSMITH_EMAIL ?? "demo@sweeper.local";
const password = env.FLAGSMITH_PASSWORD ?? randomBytes(12).toString("hex") + "Aa1!";

const api = async (path, body, token) => {
  const r = await fetch(`${BASE}/api/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...(token && { authorization: `Token ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const t = await r.text();
  return { ok: r.ok, status: r.status, data: t ? JSON.parse(t) : {} };
};

if (!env.FLAGSMITH_EMAIL) {
  const s = await api("/auth/users/", { email, password, re_password: password, first_name: "Demo", last_name: "User" });
  if (!s.ok) throw new Error("signup failed " + s.status + JSON.stringify(s.data));
  appendFileSync(".env", `FLAGSMITH_EMAIL=${email}\nFLAGSMITH_PASSWORD=${password}\nFLAGSMITH_URL=${BASE}\n`);
}
const login = await api("/auth/login/", { email, password });
if (!login.ok) throw new Error("login failed " + login.status);
const token = login.data.key;

const orgs = await api("/organisations/", null, token);
const org = orgs.data.results?.[0] ?? (await api("/organisations/", { name: "Demo Org" }, token)).data;
const project = (await api("/projects/", { name: "sweeper-demo", organisation: org.id }, token)).data;
if (!project.id) throw new Error("project create failed (already seeded?) " + JSON.stringify(project));
const environment = (await api("/environments/", { name: "Production", project: project.id }, token)).data;

for (const [name, enabled] of [["new_checkout", true], ["dark_mode", true], ["fast_search", false], ["max_items", false], ["unused_beta_banner", false]]) {
  const f = await api(`/projects/${project.id}/features/`, { name, default_enabled: enabled, initial_value: name === "max_items" ? "50" : null }, token);
  if (!f.ok) throw new Error(`feature ${name}: ${JSON.stringify(f.data)}`);
}
appendFileSync(".env", `FLAGSMITH_TOKEN=${token}\nFLAGSMITH_PROJECT_ID=${project.id}\nFLAGSMITH_ENV_KEY=${environment.api_key}\n`);
console.log("seeded project", project.id, "- creds + token written to .env");
