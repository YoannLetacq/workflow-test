# projet-builder — larger-scale run profile (notes-api, 5 poles)

Instrumented run of a bigger brief to stress the pipeline at 5 poles with real inter-pole
contracts. Companion to the 3-pole mdsite baseline. **n=1 reference profile.**

- **Date:** 2026-07-13 · **omc:** 4.15.4 · **Stack:** FastAPI + TestClient (shared `.venv`)
- **Brief:** notes-api — REST notes service (CRUD /notes) + HTML/JS client + pytest + CI workflow
- **Poles (5):** api / storage / frontend / tests / ci · commits-only · star topology

## Profile

| Metric | notes-api (5 poles) | mdsite baseline (3 poles) |
|---|---|---|
| End-to-end (monitored span) | **~341 s** | ~164 s |
| Token total (HUD proxy) | **≈ 202 k** | ≈ 99 k |
| Per-pole tokens | api 58.6k · tests 45.8k · storage 32.7k · frontend 32.3k · ci 32.7k | ~30–38k each |
| Coordination round-trips | 1 wired (api↔storage) | 1 (engine↔theme) |
| Boot-idle nudges | 0 | 0 (this baseline) |

Scaling is roughly linear in pole count: ~1.7× poles → ~2× wall-clock and ~2× tokens. Each pole
still pays a ~32 k bootstrap floor; api (persistence wiring + coordination) and tests (TestClient
suite) carried the most work.

## Key finding — a fixed brief contract did NOT prevent cross-pole drift

The brief fixed the contract (`Note = {id,title,body,done}`, explicit endpoints). Yet the system
came out internally inconsistent, and in **two** compounding ways:
- **A pole drifted from the brief:** `storage` dropped `done` (added `created_at`/`updated_at`
  instead; `update()` silently ignores unknown keys). `frontend` and `tests` followed the brief
  (kept `done`); so poles disagreed.
- **The conductor's reconciliation went the WRONG direction.** At the one wired coordination edge
  (`api↔storage`), the conductor aligned `api` *down* to storage's drifted shape (dropped `done`)
  instead of correcting storage *up* to the brief. That propagated the drift to `api`.
- **`tests` had no coordination edge** — it kept asserting `done`, so the assembled app failed:
  `pytest` → `KeyError: 'done'` (1 failed / 3 passed). The integration test caught **both** the
  missing edge and the bad reconciliation direction.

**Lessons (sharpen `ORCHESTRATION_PIPELINE.md §4/§7`):**
1. A fixed brief is necessary but **not sufficient** — poles still drift.
2. The star reconciles drift **only where a coordination edge is wired**; a pole without one
   silently trusts the brief.
3. **Reconcile toward the brief/spec, not toward whichever pole spoke first** — the conductor here
   reconciled toward the drifted pole and was wrong.
4. The reliable safety net is a **final cross-pole integration pass** (assemble + run the suite),
   which surfaced the incoherence. A post-run reconciliation (delegated to an `executor`) then
   aligned all four layers to the brief — `done` restored end-to-end, **4/4 tests pass**
   (independently re-verified) — see `bench/reconcile-report.md`.

## Observability (confirms baseline finding)

`get-summary` again undercounted: final tasks showed completed 4/5 with `alive:false` throughout,
though all poles had produced their files. Functional signals (markers, deliverables, pane tokens,
and the assembled pytest run) were the reliable completion/health signals — not omc task-status.

## Caveats

- n=1; token figures are HUD-scrape approximations including bootstrap overhead.
- FastAPI required a pre-created `.venv` (conductor-provisioned) to avoid concurrent pip races.
- Final green-test state is the post-reconciliation deliverable (the raw parallel output was
  internally inconsistent — that inconsistency is the run's headline finding).
