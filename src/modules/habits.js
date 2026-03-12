import { completeHabit, subscribeHabits, resetHabitsForToday } from "../services/habitService.js";

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
    const today = new Date().toDateString();

    Object.entries(habitsById).forEach(([id, habit]) => {
      const isDoneToday = habit.lastCompleted === today;
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

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timeout = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
      runReset();
      setInterval(runReset, 24 * 60 * 60 * 1000);
    }, timeout);

    runReset();
  }

  elements.habitTrackingTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    activeHabitTab = button.dataset.tab;
    updateTabState();
    renderHabits();
  });

  updateTabState();
  scheduleDailyReset();

  return subscribeHabits((habits) => {
    habitsById = habits || {};
    renderHabits();
  });
}
