import { focusApi } from "../core/firebaseService.js";
import { recordFocusSessionCompletion } from "./progressService.js";

export async function startFocusSession(minutes) {
  const now = Date.now();
  const sessionRef = await focusApi.addSession({
    startTime: now,
    duration: minutes,
    status: "active",
    endedAt: null,
    createdAt: now
  });

  const sessionId = sessionRef.key;
  await focusApi.setSessionState({
    focusSessionActive: true,
    sessionId,
    startTime: now,
    duration: minutes
  });

  return { sessionId, startTime: now, duration: minutes };
}

export async function finalizeFocusSession(sessionId, status) {
  await focusApi.updateSessionById(sessionId, { status, endedAt: Date.now() });
  await focusApi.clearSessionState();
  if (status === "completed") {
    recordFocusSessionCompletion({ sessionId });
  }
}

export function subscribeFocusSessions(callback) {
  return focusApi.subscribeSessions(callback);
}

export function getFocusSessionState() {
  return focusApi.getSessionState();
}

export function deleteFocusSession(sessionId) {
  return focusApi.deleteSessionById(sessionId);
}
