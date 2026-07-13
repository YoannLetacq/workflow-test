# projet-builder — reference run report (mdsite)

First real end-to-end run of the Groupe Treuil autonomous multi-session pipeline
(`projet-builder`, governed by `gouvernance/ORCHESTRATION_PIPELINE.md`). This repo is
the disposable testbed; this report is the reference trace.

- **Date:** 2026-07-13
- **omc:** 4.15.4 · **claude:** 2.1.x
- **Brief:** `mdsite` — a static-site generator (Markdown subset → HTML site with a theme).
- **Mode:** commits-only (no PR/bot), 3 poles, bounded, sandbox = this repo.

## Topology

STAR (poles coordinate through the conductor, never peer-to-peer). Conductor = the
launching session; poles = 3 independent `claude` sessions in one tmux window via
`omc team 3:claude`, self-selecting their mission by `OMC_TEAM_WORKER` id.

| Pole | Worker | Mission | Result |
|------|--------|---------|--------|
| engine | worker-1 | `mdsite/build.py` (pure-Python Markdown subset → HTML + template substitution) + `tests/test_build.py` + `content/hello.md` | ✅ 6/6 tests pass; build produces `site/*.html` + index |
| theme  | worker-2 | `mdsite/template.html` (`{{title}}`/`{{content}}`) + `mdsite/theme.css` | ✅ delivered |
| docs   | worker-3 | `README.md` | ✅ delivered |

## What the run exercised (and verified)

1. **Brief intake + pole derivation** — 3 poles derived from the brief, one mission file each.
2. **Parallel autonomous execution** — theme + docs completed unattended; engine ran its own work.
3. **Star coordination** — engine needed the theme's template placeholder names; it raised a
   request to the conductor (`COORD_engine_request.txt`) and stopped; the conductor relayed the
   theme's reported placeholders (`{{title}}`/`{{content}}`) back down; engine resumed and used
   them. No peer-to-peer contact.
4. **Self-heal via `omc team api recover-worker` (omc 4.15.4)** — the engine worker was killed
   mid-work (simulated crash). `recover-worker` (request_id `rec-engine-01`) returned
   `outcome: recovered` (new pane, `manifestSync: synced`, `committed: true`); `read-recovery-result`
   returned `outcome: succeeded`, `kind: final`. The recovered worker then completed the full engine
   mission — `build.py` written, 6 tests green, end-to-end build working.

## Findings (folded into the governance corpus / for future runs)

- **Intermittent boot injection stall (worker-1).** The engine worker booted idle (0 tokens) — its
  mission prompt was not submitted at launch (the `Enter`/startup-notice race), while worker-2/3
  received theirs. The conductor detected the idle pane and re-injected the mission (the sanctioned
  single `send-keys` resume). → supervision must treat "booted but idle / 0-token" as a nudge case.
- **`recover-worker` works end-to-end** and is the supported self-heal path; the recovered worker
  resumes the mission. This closes the last "to verify" of `ORCHESTRATION_PIPELINE.md §5`.
- **Cooperative reporting confirmed** — poles were observed via tmux panes + deliverable/marker files
  (pane activity is the ground-truth liveness signal, per §5).

## Verification

```
$ python3 tests/test_build.py     # 6/6 ok, ALL PASS (exit 0)
$ python3 mdsite/build.py         # Built 1 page(s) + index into ./site
```

Committed by the conductor (commits-only mode; poles did not run git). Generated output
(`site/`, `__pycache__/`, `.omc/`) is gitignored.
