import { habitsApi } from "../core/firebase.js";
import { applyReward } from "../core/rewardEngine.js";

function buildActions(actions) {
  const wrap = document.createElement("div");
  wrap.className = "item-actions";
  actions.forEach(({ label, onClick }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    wrap.appendChild(btn);
  });
  return wrap;
}

function nextHabitState(habit) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  const last = habit.lastCompleted;

  if (last === today) {
    throw new Error("Habit already completed today");
  }

  const streak = last === yesterday ? (habit.streak || 0) + 1 : 1;
  return { lastCompleted: today, streak };
}

export function initHabits(elements, notifyError) {
  async function completeHabit(habitId, habit) {
    try {
      const nextState = nextHabitState(habit);
      await applyReward(habit.reward || {}, { source: habit.title || "Habit" });
      await habitsApi.patchById(habitId, nextState);
    } catch (error) {
      notifyError(error, "Failed to complete habit");
    }
  }

  return habitsApi.subscribe((habits) => {
    elements.habitList.innerHTML = "";
    if (!habits) return;

    Object.entries(habits).forEach(([id, habit]) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      title.textContent = `${habit.title} (streak: ${habit.streak || 0})`;
      li.appendChild(title);
      li.appendChild(buildActions([{ label: "Complete", onClick: () => completeHabit(id, habit) }]));
      elements.habitList.appendChild(li);
    });
  });
}
