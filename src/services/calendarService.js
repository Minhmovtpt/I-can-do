import { calendarApi } from "../core/firebaseService.js";
import { requireNonEmptyText, requireEnum } from "../core/validation.js";

function toTimestamp(value, fieldName) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }
  return timestamp;
}

function normalizeLinkType(value) {
  if (value === undefined || value === null || value === "") return null;
  return requireEnum(value, ["task", "focus"], "Link type");
}

function buildEventPayload({ title, startAt, endAt, notes = "", linkType = null, linkId = "" }) {
  const normalizedStartAt = toTimestamp(startAt, "Start time");
  const normalizedEndAt = toTimestamp(endAt, "End time");

  if (normalizedEndAt <= normalizedStartAt) {
    throw new Error("End time must be after start time.");
  }

  return {
    title: requireNonEmptyText(title, "Event title", { maxLength: 120 }),
    startAt: normalizedStartAt,
    endAt: normalizedEndAt,
    notes: String(notes || "").trim(),
    linkType: normalizeLinkType(linkType),
    linkId: String(linkId || "").trim() || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function createCalendarEvent(input) {
  return calendarApi.addEvent(buildEventPayload(input));
}

export async function updateCalendarEvent(eventId, updates = {}) {
  const payload = { updatedAt: Date.now() };

  if (updates.title !== undefined) {
    payload.title = requireNonEmptyText(updates.title, "Event title", { maxLength: 120 });
  }

  const current =
    updates.startAt !== undefined || updates.endAt !== undefined
      ? await calendarApi.getEventById(eventId)
      : null;
  const hasStart = updates.startAt !== undefined;
  const hasEnd = updates.endAt !== undefined;

  if (hasStart) {
    payload.startAt = toTimestamp(updates.startAt, "Start time");
  }

  if (hasEnd) {
    payload.endAt = toTimestamp(updates.endAt, "End time");
  }

  const effectiveStartAt = payload.startAt ?? current?.startAt;
  const effectiveEndAt = payload.endAt ?? current?.endAt;
  if (
    effectiveStartAt !== undefined &&
    effectiveEndAt !== undefined &&
    effectiveEndAt <= effectiveStartAt
  ) {
    throw new Error("End time must be after start time.");
  }

  if (updates.notes !== undefined) {
    payload.notes = String(updates.notes || "").trim();
  }

  if (updates.linkType !== undefined) {
    payload.linkType = normalizeLinkType(updates.linkType);
  }

  if (updates.linkId !== undefined) {
    payload.linkId = String(updates.linkId || "").trim() || null;
  }

  return calendarApi.updateEventById(eventId, payload);
}

export async function deleteCalendarEvent(eventId) {
  return calendarApi.deleteEventById(eventId);
}

export function subscribeCalendarEvents(callback) {
  return calendarApi.subscribeEvents(callback);
}
