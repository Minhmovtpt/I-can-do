import { completeHabit, subscribeHabits, resetHabitsForToday } from "../services/habitService.js";
import { isWeeklyHabitDueOnDate, toDayString } from "../core/habitLogic.js";
import { getCurrentWorkStatus, getItemCompletionDayKey } from "../core/scheduling.js";
import { scheduleAtLocalDayBoundary } from "../core/dayBoundaryScheduler.js";

function makeTrackingCard({ title, time, isDoneToday, onComplete }) {
  const card = document.createElement("article");
  card.className = "work-card";

  const heading = document.createElement("h4");
  heading.className = "work-card-title";
  heading.textContent = title;

  const timeText = document.createElement("p");
  timeText.className = "work-card-time";
  timeText.textContent = time || "--:--";

  const actions = document.createElement("div");
  actions.className = "item-actions";
  const completeBtn = document.createElement("button");
  completeBtn.textContent = isDoneToday ? "Completed" : "Complete";
  completeBtn.className = isDoneToday ? "btn-muted" : "";
  completeBtn.disabled = isDoneToday;
  completeBtn.addEventListener("click", onComplete);

  actions.appendChild(completeBtn);
  card.append(heading, timeText, actions);
  return card;
}

export function initHabits(elements, notifyError) {
  let activeHabitTab = "active";
  let habitsById = {};

  function updateTabState() {
    elements.habitTrackingTabs.querySelectorAll("button[data-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === activeHabitTab);
    });
  }

  function renderHabits() {
    elements.habitList.innerHTML = "";
    const today = new Date();
    const todayKey = toDayString(today);

    Object.entries(habitsById)
      .filter(([, habit]) => isWeeklyHabitDueOnDate(habit, today))
      .forEach(([id, habit]) => {
        const isDoneToday =
          getCurrentWorkStatus(habit) === "completed" &&
          getItemCompletionDayKey(habit) === todayKey;
        const hiddenByTab =
          (activeHabitTab === "active" && isDoneToday) ||
          (activeHabitTab === "completed" && !isDoneToday);
        if (hiddenByTab) return;

        const li = document.createElement("li");
        li.appendChild(
          makeTrackingCard({
            title: habit.title,
            time: habit.schedule?.time,
            isDoneToday,
            onComplete: () =>
              completeHabit(id, habit).catch((error) =>
                notifyError(error, "Failed to complete habit"),
              ),
          }),
        );
        elements.habitList.appendChild(li);
      });
  }

  function scheduleDailyReset() {
    async function runReset() {
      try {
        await resetHabitsForToday();
      } catch (error) {
        notifyError(error, "Failed to reset habits");
      }
    }

    runReset();
    return scheduleAtLocalDayBoundary(runReset);
  }

  elements.habitTrackingTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    activeHabitTab = button.dataset.tab;
    updateTabState();
    renderHabits();
  });

  updateTabState();
  const stopResetSchedule = scheduleDailyReset();

  const unsubscribe = subscribeHabits((habits) => {
    habitsById = habits || {};
    renderHabits();
  });

  return () => {
    stopResetSchedule();
    unsubscribe();
  };
}
