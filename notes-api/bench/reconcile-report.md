# Reconciliation report — notes API `done` field

Five parallel poles drifted from `brief.md` (`Note = {id, title, body, done:bool=false}`):
storage dropped `done`, api followed storage, but tests (and the frontend,
`static/app.js`) were already written expecting `done`. Reconciled toward the
brief.

## Changes

- `app/storage.py`
  - Schema: added `done INTEGER NOT NULL DEFAULT 0` column.
  - `_UPDATABLE` now includes `"done"`.
  - `add(title, body, done=False)` — writes `done` on insert.
  - `update(note_id, **fields)` — applies `done` when passed (coerced to int
    for storage), alongside existing title/body handling; unknown keys still
    ignored.
  - Added `_row_to_dict()` to convert the stored `0/1` back to `bool` for
    `get()`/`list_all()`/`add()` returns, so Note dicts expose `done: bool`.
  - Updated docstring Note shape and the `_demo()` self-check to cover `done`.

- `app/main.py`
  - `Note` response model: added `done: bool`.
  - `NoteUpdate`: added `done: bool | None = None` (title/body/done all
    optional, PATCH-like PUT via `exclude_none`).
  - `NoteCreate` unchanged (`title`, `body` only) — `done` defaults to
    `False` via `storage.add()`, matching brief's `done:bool=false` on create.
  - Updated module docstring (removed stale "no done field" conductor note).
  - No endpoint logic changes needed beyond the models — `create_note`/
    `update_note` already delegate straight to storage.

- `tests/test_api.py`
  - `_NOTE_KEYS` includes `done`.
  - `_assert_note()` takes a `done=False` kwarg and asserts it.
  - `test_full_crud_cycle` now asserts `done is False` on create/get, and
    exercises `PUT .../done: True` alongside title/body, asserting the
    response reflects `done is True`.
  - Updated module docstring to describe the real (brief-aligned) contract.

- Removed stale `notes.db` (schema-incompatible with the new `done` column)
  before running tests so the DB is recreated fresh.

- `static/app.js` / `static/index.html`: no changes — already coded against
  the brief's `done` field (checkbox toggle, strikethrough style), so they
  were the one pole not drifted. They now work against the reconciled API.

## Test result

```
4 passed, 1 warning in 0.47s
```

(The one warning is an unrelated pre-existing `httpx`/`starlette` deprecation
notice, not related to this change.)

`app/storage.py` self-check (`python -m app.storage`) also passes: `storage
self-check OK`.

## Residual risk

- `notes.db` at the repo root is gitignored/ephemeral; if any other
  environment has an old `notes.db` without the `done` column, first run
  against it will hit a `sqlite3.OperationalError: no such column: done` on
  reads/writes until it's deleted or migrated. No migration path was added
  (brief doesn't call for one, and it's a dev-local SQLite file, not a
  production or shared DB).
- `README.md`, `COORD_*` files, and `run-report.md` still describe the old
  no-`done` shape (they document the drifted intermediate state); left
  untouched since the task scoped changes to `app/` and `tests/`.
