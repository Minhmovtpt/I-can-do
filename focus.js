import { focusApi } from "./firebase.js";
import { applyReward } from "./rewardEngine.js";

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

export function initFocus(elements, notifyError) {
  let focusInterval = null;
  let activeSessionId = null;
  let activeSessionStart = null;
  let activeSessionDuration = null;

  function updateTimerDisplay(seconds) {
    const safe = Math.max(0, seconds);
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    elements.focusTimer.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  async function finalizeSession(status) {
    if (!activeSessionId) return;
    await focusApi.updateSessionById(activeSessionId, { status, endedAt: Date.now() });
    await focusApi.clearSessionState();
    activeSessionId = null;
    activeSessionStart = null;
    activeSessionDuration = null;
  }

  function startFocusTimer(startTime, durationMinutes) {
    if (focusInterval) clearInterval(focusInterval);
    const totalSeconds = durationMinutes * 60;

    const tick = async () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = totalSeconds - elapsedSeconds;
      updateTimerDisplay(remaining);

      if (remaining <= 0) {
        clearInterval(focusInterval);
        focusInterval = null;
        try {
          await finalizeSession("completed");
          await applyReward({ foc: 5, exp: 10 }, { source: "Focus Session" });
        } catch (error) {
          notifyError(error, "Failed to finalize focus session");
        }
      }
    };

    tick();
    focusInterval = setInterval(tick, 1000);
  }

  async function beginFocusSession(minutes) {
    if (!minutes || minutes <= 0) return notifyError(new Error("Invalid focus duration"));
    if (activeSessionId) return alert("A focus session is already active.");

    try {
      const now = Date.now();
      const sessionRef = await focusApi.addSession({
        startTime: now,
        duration: minutes,
        status: "active",
        endedAt: null,
        createdAt: now
      });

      activeSessionId = sessionRef.key;
      activeSessionStart = now;
      activeSessionDuration = minutes;

      await focusApi.setSessionState({
        focusSessionActive: true,
        sessionId: activeSessionId,
        startTime: activeSessionStart,
        duration: activeSessionDuration
      });

      startFocusTimer(activeSessionStart, activeSessionDuration);
    } catch (error) {
      notifyError(error, "Failed to start focus session");
    }
  }

  async function cancelActiveFocusSession() {
    if (!activeSessionId) return;
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
    }
    try {
      await finalizeSession("cancelled");
      updateTimerDisplay(0);
    } catch (error) {
      notifyError(error, "Failed to cancel focus session");
    }
  }

  async function deleteFocusSession(sessionId) {
    try {
      if (sessionId === activeSessionId) {
        await cancelActiveFocusSession();
      }
      await focusApi.deleteSessionById(sessionId);
    } catch (error) {
      notifyError(error, "Failed to delete focus session");
    }
  }

  async function restoreFocusSessionIfAny() {
    try {
      const state = await focusApi.getSessionState();
      if (!state || !state.focusSessionActive) return;
      activeSessionId = state.sessionId;
      activeSessionStart = state.startTime;
      activeSessionDuration = state.duration;
      startFocusTimer(activeSessionStart, activeSessionDuration);
    } catch (error) {
      notifyError(error, "Failed to restore focus session");
    }
  }

  elements.cancelFocusBtn.addEventListener("click", cancelActiveFocusSession);
  elements.focusButtons.forEach((button) => {
    button.addEventListener("click", () => beginFocusSession(Number(button.dataset.duration)));
  });

  const unsubscribe = focusApi.subscribeSessions((sessions) => {
    elements.focusSessionList.innerHTML = "";
    if (!sessions) return;

    Object.entries(sessions)
      .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(([id, session]) => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${session.duration}m — ${session.status || "unknown"}`;
        li.appendChild(text);

        const actions = [];
        if (id === activeSessionId && session.status === "active") {
          actions.push({ label: "Cancel", onClick: cancelActiveFocusSession });
        }
        actions.push({ label: "Delete", className: "btn-danger", onClick: () => deleteFocusSession(id) });
        li.appendChild(buildActions(actions));
        elements.focusSessionList.appendChild(li);
      });
  });

  restoreFocusSessionIfAny();
  return unsubscribe;
}
