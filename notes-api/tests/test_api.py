"""API tests for the notes service (pole tests / worker-4).

Exercises the shared-contract /notes endpoints against app.main:app via
Starlette/FastAPI TestClient. A throwaway SQLite DB (NOTES_DB env) is used so
the suite never touches the developer's notes.db.

Shared contract (brief.md):
    Note = {id:int, title:str, body:str, done:bool=false, created_at:str, updated_at:str}
    POST /notes -> 201            GET /notes -> 200 (list)
    GET /notes/{id} -> 200|404    PUT /notes/{id} -> 200|404 (title/body/done)
    DELETE /notes/{id} -> 204|404
"""

import importlib
import os

import pytest
from fastapi.testclient import TestClient

_NOTE_KEYS = {"id", "title", "body", "done", "created_at", "updated_at"}


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    # Isolate persistence: point storage at a throwaway DB before importing app.
    db = tmp_path_factory.mktemp("data") / "notes.db"
    os.environ["NOTES_DB"] = str(db)
    import app.main as main
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def _assert_note(note, *, title, body, done=False):
    assert set(note) == _NOTE_KEYS
    assert isinstance(note["id"], int)
    assert note["title"] == title
    assert note["body"] == body
    assert note["done"] is done
    assert note["created_at"] and note["updated_at"]


def test_full_crud_cycle(client):
    # create
    r = client.post("/notes", json={"title": "first", "body": "hello"})
    assert r.status_code == 201, r.text
    created = r.json()
    _assert_note(created, title="first", body="hello", done=False)
    note_id = created["id"]

    # list contains it
    r = client.get("/notes")
    assert r.status_code == 200, r.text
    assert note_id in [n["id"] for n in r.json()]

    # get by id
    r = client.get(f"/notes/{note_id}")
    assert r.status_code == 200, r.text
    _assert_note(r.json(), title="first", body="hello", done=False)

    # update title/body/done
    r = client.put(
        f"/notes/{note_id}",
        json={"title": "renamed", "body": "world", "done": True},
    )
    assert r.status_code == 200, r.text
    updated = r.json()
    _assert_note(updated, title="renamed", body="world", done=True)
    assert updated["updated_at"] >= created["updated_at"]

    # delete
    r = client.delete(f"/notes/{note_id}")
    assert r.status_code == 204, r.text

    # gone
    r = client.get(f"/notes/{note_id}")
    assert r.status_code == 404, r.text


def test_get_missing_is_404(client):
    assert client.get("/notes/999999").status_code == 404


def test_update_missing_is_404(client):
    assert client.put("/notes/999999", json={"title": "x"}).status_code == 404


def test_delete_missing_is_404(client):
    assert client.delete("/notes/999999").status_code == 404
