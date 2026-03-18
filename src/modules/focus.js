import {
  startSession,
  cancelSession,
  completeSession,
  subscribeFocusSessions,
  getFocusSessionState,
} from "../services/focusService.js";

export function initFocus(elements, notifyError) {
  let timerId = null;
  let activeSessionId = null;
  let activeStart = null;
  let activeDuration = null;

  function updateTimerView(seconds) {
    const safe = Math.max(0, Number(seconds || 0));
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    elements.focusDashboardTimer.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function updateDashboardStats(sessions) {
    const list = Object.values(sessions || {});
    const today = new Date().toDateString();
    const completedToday = list.filter(
      (row) =>
        row.status === "completed" && row.endedAt && new Date(row.endedAt).toDateString() === today,
    );
    const totalMinutes = completedToday.reduce((sum, row) => sum + Number(row.duration || 0), 0);
    elements.focusSessionToday.textContent = String(completedToday.length);
    elements.focusTotalTimeToday.textContent = `${totalMinutes}m`;
  }

  async function finalizeActiveSession(status) {
    if (!activeSessionId) return;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    try {
      if (status === "completed") {
        await completeSession(activeSessionId);
      } else {
        await cancelSession(activeSessionId);
      }
      activeSessionId = null;
      activeStart = null;
      activeDuration = null;
      updateTimerView(0);
    } catch (error) {
      notifyError(error, "Failed to update focus session");
    }
  }

  function startTicker() {
    if (!activeStart || !activeDuration) return;
    if (timerId) clearInterval(timerId);

    const total = activeDuration * 60;
    const tick = async () => {
      const elapsed = Math.floor((Date.now() - activeStart) / 1000);
      const remaining = total - elapsed;
      updateTimerView(remaining);
      if (remaining <= 0) {
        await finalizeActiveSession("completed");
      }
    };

    tick();
    timerId = setInterval(tick, 1000);
  }

  async function handleStart() {
    if (activeSessionId) return;

    try {
      const state = await startSession(90);
      activeSessionId = state.sessionId;
      activeStart = state.startTime;
      activeDuration = state.duration;
      startTicker();
    } catch (error) {
      notifyError(error, "Failed to start focus session");
    }
  }

  async function restoreIfNeeded() {
    try {
      const state = await getFocusSessionState();
      if (!state?.focusSessionActive) return;
      activeSessionId = state.sessionId;
      activeStart = state.startTime;
      activeDuration = state.duration;
      startTicker();
    } catch (error) {
      notifyError(error, "Failed to restore focus session");
    }
  }

  elements.focusDashboardStartBtn?.addEventListener("click", handleStart);
  elements.focusDashboardStopBtn?.addEventListener("click", () =>
    finalizeActiveSession("cancelled"),
  );

  const unsubscribe = subscribeFocusSessions((sessions) => {
    updateDashboardStats(sessions);
  });

  restoreIfNeeded();
  return unsubscribe;
}
