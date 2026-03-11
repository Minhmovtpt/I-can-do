import { notesApi } from "../core/firebase.js";
import { createNote, updateNote, deleteNote } from "../services/noteService.js";

function buildActions(actions) {
  const wrap = document.createElement("div");
  wrap.className = "item-actions";
  actions.forEach(({ label, onClick, className }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = className || "";
    btn.addEventListener("click", onClick);
    wrap.appendChild(btn);
  });
  return wrap;
}

export function initNotes(elements, notifyError) {
  async function saveNote() {
    try {
      await createNote(elements.noteInput.value);
      elements.noteInput.value = "";
    } catch (error) {
      notifyError(error, "Failed to save note");
    }
  }

  async function editNote(noteId, note) {
    const nextContent = prompt("Edit note:", note.content || "");
    if (nextContent === null) return;
    try {
      await updateNote(noteId, nextContent);
    } catch (error) {
      notifyError(error, "Failed to update note");
    }
  }

  elements.saveNoteBtn.addEventListener("click", saveNote);

  const unsubscribe = notesApi.subscribe((notes) => {
    elements.notesList.innerHTML = "";
    if (!notes) return;

    Object.entries(notes)
      .sort(([, a], [, b]) => (b.date || 0) - (a.date || 0))
      .forEach(([id, note]) => {
        const li = document.createElement("li");
        const content = document.createElement("span");
        content.textContent = note.content;
        li.appendChild(content);
        li.appendChild(
          buildActions([
            { label: "Edit", onClick: () => editNote(id, note) },
            {
              label: "Delete",
              className: "btn-danger",
              onClick: () => deleteNote(id).catch((e) => notifyError(e, "Failed to delete note"))
            }
          ])
        );
        elements.notesList.appendChild(li);
      });
  });

  return unsubscribe;
}
