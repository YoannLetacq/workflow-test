// Minimal notes UI. Talks to the shared-contract /notes endpoints via fetch().
const api = "/notes";
const list = document.getElementById("notes");
const form = document.getElementById("add-form");

async function load() {
  const res = await fetch(api);
  const notes = await res.json();
  list.innerHTML = "";
  for (const n of notes) render(n);
}

function render(n) {
  const li = document.createElement("li");
  if (n.done) li.className = "done";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = !!n.done;
  check.addEventListener("change", () => toggle(n));

  const body = document.createElement("span");
  body.className = "body";
  body.innerHTML = `<span class="title"></span> `;
  body.querySelector(".title").textContent = n.title;
  body.append(document.createTextNode(n.body || ""));

  const del = document.createElement("button");
  del.textContent = "Delete";
  del.addEventListener("click", () => remove(n.id));

  li.append(check, body, del);
  list.append(li);
}

async function toggle(n) {
  await fetch(`${api}/${n.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: n.title, body: n.body, done: !n.done }),
  });
  load();
}

async function remove(id) {
  await fetch(`${api}/${id}`, { method: "DELETE" });
  load();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title");
  const body = document.getElementById("body");
  await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title.value, body: body.value, done: false }),
  });
  form.reset();
  title.focus();
  load();
});

load();
