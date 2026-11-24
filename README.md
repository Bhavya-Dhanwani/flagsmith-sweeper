# 🧹 Flagsmith Sweeper

Feature flags pile up. After a rollout finishes nobody removes the flag, so codebases fill with dead `if` branches, ghost flags and clutter in the dashboard.

**Flagsmith Sweeper** compares your code against your self-hosted [Flagsmith](https://github.com/Flagsmith/flagsmith), reports stale flags, **rewrites the code to remove them**, and (via a GitHub Action) opens the cleanup PR for you.

Built for the *Toggle Wars* hackathon, Track 03: Build on Open Source Flagsmith.

## What it finds

| | Meaning |
|---|---|
| 🗑 | Flag is ON (or OFF) in Flagsmith: the check is dead code. Safe to remove. |
| 👻 | Used in code but missing in Flagsmith (silently returns the default). |
| 💤 | Exists in Flagsmith but no code uses it. |
| ✅ | Config value (`getValue`) in use. Left alone. |

`fix` rewrites JS/TS with a real parser ([ts-morph](https://ts-morph.com)), not an LLM, so it can't hallucinate: `if/else`, `if` without `else`, ternaries and `!flag` are collapsed to the branch that actually runs.

```diff
- if (flags.isEnabled("new_checkout")) {
-   return "new checkout";
- } else {
-   return "old checkout";
- }
+ return "new checkout";
```

## How Flagsmith is used

- Self-hosted Flagsmith (Docker) is the source of truth.
- The Flagsmith REST API supplies the project's features (`/projects/{id}/features/`) and their per-environment state (`/environments/{key}/featurestates/`).
- The seed script creates a demo project and flags through the same API.

## Quick start

Needs Docker and Node 22.

```bash
npm install
docker compose up -d          # Flagsmith at http://localhost:8000
node scripts/seed.mjs         # demo project + flags; writes credentials to .env (gitignored)

npx tsx src/cli.ts scan sample-app   # report + sweeper-report.html
npx tsx src/cli.ts fix  sample-app   # rewrite the code (use git to review the diff)
npm test
```

## GitHub Action

Runs the scan and fix, then opens a PR with the report. Your Flagsmith must be reachable from GitHub's runners.

```yaml
- uses: actions/checkout@v4
- uses: <owner>/flagsmith-sweeper@main
  with:
    flagsmith-url: ${{ vars.FLAGSMITH_URL }}
    token: ${{ secrets.FLAGSMITH_TOKEN }}
    project-id: ${{ vars.FLAGSMITH_PROJECT_ID }}
    environment-key: ${{ vars.FLAGSMITH_ENV_KEY }}
```

See [.github/workflows/sweep.yml](.github/workflows/sweep.yml) for a full example. The Action has not yet been run on GitHub.

## Limits

- Auto-fix covers JS/TS; other languages are detected and reported only.
- "Stale" means on/off in the one environment you point it at. Flagsmith's API has no simple "last evaluated" time, so usage-based staleness is future work.
- Complex expressions (`a && flag`) become `a && true`; tidy by hand.
