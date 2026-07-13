"""SQLite-backed storage for notes.

Exposes NotesRepository, a thin CRUD layer over a SQLite file (default
``notes.db``) using the stdlib ``sqlite3`` module. The ``notes`` table is
created on init if absent. Every method returns plain dicts (Note shape) so
callers stay decoupled from sqlite3 Row objects.

Note shape:
    {"id": int, "title": str, "body": str, "done": bool,
     "created_at": str, "updated_at": str}   # timestamps are UTC ISO-8601
"""

import sqlite3
from datetime import datetime, timezone

_UPDATABLE = ("title", "body", "done")


def _now():
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row):
    d = dict(row)
    d["done"] = bool(d["done"])
    return d


class NotesRepository:
    def __init__(self, db_path="notes.db"):
        self._conn = sqlite3.connect(db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT NOT NULL,
                body       TEXT NOT NULL,
                done       INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"""
        )
        self._conn.commit()

    def add(self, title, body, done=False):
        now = _now()
        cur = self._conn.execute(
            "INSERT INTO notes (title, body, done, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (title, body, int(done), now, now),
        )
        self._conn.commit()
        return self.get(cur.lastrowid)

    def list_all(self):
        rows = self._conn.execute(
            "SELECT * FROM notes ORDER BY id"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]

    def get(self, note_id):
        row = self._conn.execute(
            "SELECT * FROM notes WHERE id = ?", (note_id,)
        ).fetchone()
        return _row_to_dict(row) if row else None

    def update(self, note_id, **fields):
        cols = {k: v for k, v in fields.items() if k in _UPDATABLE}
        if not cols or self.get(note_id) is None:
            return self.get(note_id)
        if "done" in cols:
            cols["done"] = int(cols["done"])
        cols["updated_at"] = _now()
        assignments = ", ".join(f"{k} = ?" for k in cols)
        self._conn.execute(
            f"UPDATE notes SET {assignments} WHERE id = ?",
            (*cols.values(), note_id),
        )
        self._conn.commit()
        return self.get(note_id)

    def delete(self, note_id):
        cur = self._conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        self._conn.commit()
        return cur.rowcount > 0

    def close(self):
        self._conn.close()


def _demo():
    """Self-check: exercises the full CRUD cycle on an in-memory DB."""
    repo = NotesRepository(":memory:")
    n = repo.add("t", "b")
    assert n["id"] == 1 and n["title"] == "t" and n["done"] is False
    assert repo.get(1) == n
    assert repo.list_all() == [n]
    u = repo.update(1, title="t2", done=True, ignored="x")
    assert u["title"] == "t2" and u["body"] == "b" and u["done"] is True
    assert u["updated_at"] >= n["updated_at"]
    assert repo.update(999, title="x") is None
    assert repo.delete(1) is True
    assert repo.delete(1) is False
    assert repo.list_all() == []
    repo.close()
    print("storage self-check OK")


if __name__ == "__main__":
    _demo()
