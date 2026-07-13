# Brief — notes-api (REST notes service + client + CI)
A small notes service. Shared contract (fixed): Note = {id:int server-assigned, title:str,
body:str, done:bool=false}. Endpoints: POST /notes (create {title,body}), GET /notes (list),
GET /notes/{id}, PUT /notes/{id} (update fields/done), DELETE /notes/{id}. Persistence in SQLite.
Poles: api (FastAPI), storage (SQLite repo), frontend (HTML/JS client), tests (pytest+TestClient), ci.
Delivered = green tests + working app + CI workflow + README, committed. Use the shared venv at .venv.
