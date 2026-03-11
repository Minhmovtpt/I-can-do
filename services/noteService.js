import { notesApi } from "../firebaseService.js";
import { requireNonEmptyText } from "../validation.js";

export async function createNote(content) {
  return notesApi.add({
    content: requireNonEmptyText(content, "Note", { maxLength: 1000 }),
    date: Date.now()
  });
}

export async function updateNote(noteId, content) {
  return notesApi.updateById(noteId, {
    content: requireNonEmptyText(content, "Note", { maxLength: 1000 }),
    date: Date.now()
  });
}

export async function deleteNote(noteId) {
  return notesApi.deleteById(noteId);
}
