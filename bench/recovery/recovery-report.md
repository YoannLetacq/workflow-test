# projet-builder — recovery-variant profile (mdsite)

Instrumented run that injects a mid-work pole failure to profile the self-heal verb
`omc team api recover-worker`. Companion to the baseline (`bench/benchmark-report.md`).
**n=1 reference profile.**

- **Date:** 2026-07-13 · **omc:** 4.15.4 · **Brief:** mdsite, 3 poles, commits-only
- **Injected failure:** engine (worker-1) `kill -9` while actively coding (build.py not yet written)

## Timeline & recovery measurement

| Event | Elapsed / value |
|---|---|
| engine killed (mid-work, task in-flight) | **107 s** |
| `omc team api recover-worker` call (wall) | **821 ms** |
| recovery terminal outcome | **~110 s** (≈3 s after kill) |
| **outcome** | **`failed` — `recovery_checkpoint_missing`** |
| post-failure team state | `manifest: repair_required`, `services: terminal_degraded` |

## The finding — recover-worker enforces exactly-once, refuses ambiguous restart

recover-worker did **not** blindly respawn. Engine was killed with an **in-flight task and no
durable checkpoint**, so the verb returned an explicit terminal `failed` /
`recovery_checkpoint_missing` (`commit_uncertain: false`) instead of restarting from an ambiguous
point. This is the maintainer's continuation-ownership contract working as designed
(issue #3449 → PR #3462): *"resume from the last acknowledged step exactly once, or terminate with
an explicit recovery failure state; never silently restart from an ambiguous point."*

### The recovery boundary (two data points)

| Kill state | recover-worker | Evidence |
|---|---|---|
| Idle / between steps / checkpointed | **`recovered` → `succeeded`** (new pane, work finished) | first mdsite run (`../run-report.md`) |
| In-flight task, **no checkpoint** | **`failed` — `recovery_checkpoint_missing`** (safe refusal) | this run |

## Implication for the pipeline (`ORCHESTRATION_PIPELINE.md §5`)

Our CLI poles do **not** emit omc checkpoints while working, so a mid-task kill lands in the
"no-checkpoint" case → recover-worker **safely fails** rather than producing a duplicate/ambiguous
build. When recover-worker returns `failed` (and leaves `manifest: repair_required`), the conductor's
correct fallback is the documented **coarse full-team `shutdown` + relaunch from the durable board**
(delivered poles are idempotent, only unfinished work re-runs) — then escalate if it still fails.

**Net:** recover-worker is cheap (~0.8 s call) and reliable within its contract — it recovers
idle/checkpointed workers and **safely declines** an in-flight-no-checkpoint kill. It is not a
universal "un-kill"; the conductor must handle the `failed`/`repair_required` branch. This sharpens
§5 step 2: treat `recover-worker` as first choice, full-team restart as the documented fallback.

## vs baseline

Baseline (no failure): end-to-end ~164 s, ~99 k tokens, 3/3 delivered. The recovery variant did not
produce a completed engine deliverable (kill + safe-failed recovery) — its purpose was to profile the
verb's behaviour at the failure boundary, which it did: fast, explicit, exactly-once-safe.

## Caveats

- n=1; the success case is cited from the first run, not re-timed here.
- Whether a kill hits "idle/checkpointed" vs "in-flight/no-checkpoint" is timing-dependent for CLI poles.
