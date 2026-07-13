# notes-api

A small REST notes service (FastAPI + SQLite) with an HTML/JS client.

Note shape (shared contract):

```json
{ "id": 1, "title": "str", "body": "str", "done": false }
```

`id` is server-assigned.

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```

## Endpoints

| Method | Path          | Description                        |
|--------|---------------|------------------------------------|
| POST   | `/notes`      | Create a note (`{title, body}`)    |
| GET    | `/notes`      | List all notes                     |
| GET    | `/notes/{id}` | Get one note by id                 |
| PUT    | `/notes/{id}` | Update fields / `done`             |
| DELETE | `/notes/{id}` | Delete a note                      |
