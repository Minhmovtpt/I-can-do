import { completeHabit, subscribeHabits } from "../services/habitService.js";

export function initHabits(elements, notifyError) {
  async function onCompleteHabit(habitId, habit) {
    try {
      await completeHabit(habitId, habit);
    } catch (error) {
      notifyError(error, "Failed to complete habit");
    }
  }

  return subscribeHabits((habits) => {
    elements.habitList.innerHTML = "";
    if (!habits) return;

    Object.entries(habits).forEach(([id, habit]) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      row.className = "item-actions";
      const title = document.createElement("span");
      title.textContent = `${habit.title} (streak: ${habit.streak || 0})`;
      const tick = document.createElement("input");
      tick.type = "checkbox";
      tick.className = "habit-tick";
      tick.checked = habit.lastCompleted === new Date().toDateString();
      tick.addEventListener("change", () => {
        if (tick.checked) onCompleteHabit(id, habit);
      });
      row.appendChild(title);
      row.appendChild(tick);
      li.appendChild(row);
      elements.habitList.appendChild(li);
    });
  });
}
