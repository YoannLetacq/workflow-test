"""FastAPI notes service (pole api).

Exposes CRUD endpoints under /notes and delegates all persistence to
app.storage.NotesRepository. The Note wire shape follows brief.md:
{id, title, body, done, created_at, updated_at}. POST creates with
done defaulting to false; PUT can update title/body/done.

DB path comes from the NOTES_DB env var (default "notes.db") so tests can
point at an isolated file.

A fresh NotesRepository is opened per request via a dependency: storage's
sqlite connection is single-thread-bound, and FastAPI runs sync endpoints in a
threadpool, so a shared connection would raise across threads. One connection
per request keeps it thread-safe without touching storage.
ponytail: per-request sqlite connect, fine at this scale; pool it if it ever isn't.
"""

import os

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from app.storage import NotesRepository

app = FastAPI(title="notes-api")

DB_PATH = os.getenv("NOTES_DB", "notes.db")


def get_repo():
    repo = NotesRepository(DB_PATH)
    try:
        yield repo
    finally:
        repo.close()


class NoteCreate(BaseModel):
    title: str
    body: str


class NoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    done: bool | None = None


class Note(BaseModel):
    id: int
    title: str
    body: str
    done: bool
    created_at: str
    updated_at: str


@app.post("/notes", response_model=Note, status_code=201)
def create_note(payload: NoteCreate, repo: NotesRepository = Depends(get_repo)):
    return repo.add(payload.title, payload.body)


@app.get("/notes", response_model=list[Note])
def list_notes(repo: NotesRepository = Depends(get_repo)):
    return repo.list_all()


@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: int, repo: NotesRepository = Depends(get_repo)):
    row = repo.get(note_id)
    if row is None:
        raise HTTPException(status_code=404, detail="note not found")
    return row


@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, payload: NoteUpdate, repo: NotesRepository = Depends(get_repo)):
    if repo.get(note_id) is None:
        raise HTTPException(status_code=404, detail="note not found")
    return repo.update(note_id, **payload.model_dump(exclude_none=True))


@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, repo: NotesRepository = Depends(get_repo)):
    if not repo.delete(note_id):
        raise HTTPException(status_code=404, detail="note not found")
