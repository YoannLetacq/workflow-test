# projet-builder — instrumented run profile (mdsite, baseline)

Monitored + profiled happy-path run of the `projet-builder` pipeline on the sandbox.
**n=1 — this is a reference profile, not a statistical benchmark.** Precise: wall-clock,
state timeline, event counts. Approximate: token counts (HUD scrape proxy).

- **Date:** 2026-07-13 · **omc:** 4.15.4 · **Brief:** mdsite (static-site generator), from scratch
- **Poles:** 3 (engine / theme / docs), commits-only, star topology, no injected failure
- **Monitor:** `bench/monitor.sh` polling `omc team api get-summary` + per-pane token HUD every 15 s → `bench/timeline.jsonl` (9 ticks); raw metrics in `bench/profile.json`

## Wall-clock (from launch)

| Milestone | Elapsed |
|---|---|
| theme delivered (`.done-theme`) | **44 s** |
| docs delivered (`.done-docs`) | **74 s** |
| conductor relays coordination (engine ↔ theme placeholders) | ~mid-run |
| engine delivered (`.done-engine`, after coordination + resume) | **164 s** |
| **End-to-end (all 3 poles delivered)** | **≈ 164 s** (2 min 44) |

Engine is the critical path: it carries the real logic (Markdown→HTML converter + tests)
**and** the one star-coordination round-trip (request placeholders → conductor relay → resume).

## Token cost (HUD proxy, peak per pane)

| Pole | Peak tokens |
|---|---|
| engine (worker-1) | 38,048 |
| theme (worker-2) | 29,615 |
| docs (worker-3) | 30,991 |
| **Total (3 poles)** | **≈ 98,654** |

Each pole pays a fixed ~30 k floor (session bootstrap: full corpus read + mission) before task
work. So the multi-agent tax here is ≈ **2.5–3×** a single-session equivalent for a task this
small — and it scales with pole count, not task size. Reserve the federation for briefs whose
work genuinely parallelizes (`ORCHESTRATION_PIPELINE.md §7`).

## Event counts

| Event | Count |
|---|---|
| Poles launched | 3 |
| Boot-idle nudges needed | **0** (contrast: the first mdsite run needed 1 — the injection stall is intermittent) |
| Star coordination round-trips (via conductor) | 1 (engine ↔ theme) |
| recover-worker invocations | 0 (baseline, no injected failure) |
| Deliverables verified | tests 7/7 pass; build → `site/hello.html` + `index.html` |

## Key finding — omc task-status undercounts completion (quantified)

At end of run, `omc team api get-summary` reported **completed: 2 / in_progress: 1** and
`alive: false` + `nonReportingWorkers: [all]` **throughout**, even though **all three poles had
delivered** (markers + files present, tests green). CLI workers do not self-mark their omc task
complete or write heartbeat/status, so omc's task-status and `alive` flags are **not** reliable
completion/liveness signals for this pipeline.

**Implication (confirms `ORCHESTRATION_PIPELINE.md §5`):** the conductor must detect completion
and liveness from **functional signals** — deliverable/marker files and per-pane token/output
activity — not from `get-summary`'s task-status or `alive`. The token-per-pane HUD scrape and
marker mtimes used here are exactly such signals and worked reliably.

## Caveats

- n=1; token figures are HUD-scrape approximations (include bootstrap overhead), not billed tokens.
- Monitor's first tick landed at elapsed 56 s (launch + boot); sub-44 s milestones are marker-derived.
- Coordination relay + resume is conductor-driven (a `send-keys` resume, the sanctioned exception).
