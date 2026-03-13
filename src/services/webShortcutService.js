import { webShortcutsApi } from "../core/firebaseService.js";

export function getShortcuts(callback) {
  return webShortcutsApi.subscribe(callback);
}

export async function createShortcut(payload) {
  const now = Date.now();
  return webShortcutsApi.add({
    name: String(payload?.name || "").trim(),
    url: String(payload?.url || "").trim(),
    icon: String(payload?.icon || "link").trim(),
    order: Number(payload?.order || now),
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteShortcut(shortcutId) {
  return webShortcutsApi.deleteById(shortcutId);
}

export async function updateShortcut(shortcutId, payload = {}) {
  return webShortcutsApi.updateById(shortcutId, {
    ...payload,
    updatedAt: Date.now(),
  });
}
