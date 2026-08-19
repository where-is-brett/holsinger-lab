# Redesign experiment — briefing package

Mirror of the files uploaded to the Claude Design project
**"Holsinger Lab — Academic Redesign"** (project id `81465533-cb59-4875-826f-7592ef09f62d`).
Design work happens in Claude Design; this folder versions the brief and prompts.
Spec: `docs/superpowers/specs/2026-08-19-claude-design-redesign-experiment-design.md`.

- `brief.md` — mirrors `brief/00-brief.md`
- `prompts/` — paste-ready session prompts per round
- `extract-content.mjs` — regenerates `brief/content.json` from the public Sanity dataset
  (`node docs/redesign-experiment/extract-content.mjs > content.json`); the JSON itself is
  not committed (public data, regenerable).
