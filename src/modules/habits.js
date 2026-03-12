import {
  completeHabit,
  createHabit,
  deleteHabit,
  subscribeHabits,
} from "../services/habitService.js";

export function initHabits(elements, notifyError) {
  async function onCompleteHabit(habitId, habit) {
    try {
      await completeHabit(habitId, habit);
    } catch (error) {
      notifyError(error, "Failed to complete habit");
    }
  }

  async function onCreateHabit() {
    try {
      await createHabit({
        title: elements.habitInput.value,
        dayOfWeek: Number(elements.habitDayInput.value),
        time: elements.habitTimeInput.value || "09:00",
        condition: elements.habitConditionInput.value,
      });
      elements.habitInput.value = "";
      elements.habitConditionInput.value = "";
    } catch (error) {
      notifyError(error, "Failed to create habit");
    }
  }

  elements.addHabitBtn.addEventListener("click", onCreateHabit);

  return subscribeHabits((habits) => {
    elements.habitList.innerHTML = "";
    if (!habits) return;

    Object.entries(habits).forEach(([id, habit]) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      row.className = "item-actions";
      const title = document.createElement("span");
      title.textContent = `${habit.title} (streak: ${habit.streak || 0}) • D${habit.schedule?.dayOfWeek ?? "?"} ${habit.schedule?.time || ""}${habit.condition ? ` • ${habit.condition}` : ""}`;
      const tick = document.createElement("input");
      tick.type = "checkbox";
      tick.className = "habit-tick";
      tick.checked = habit.lastCompleted === new Date().toDateString();
      tick.addEventListener("change", () => {
        if (tick.checked) onCompleteHabit(id, habit);
      });

      const remove = document.createElement("button");
      remove.className = "btn-danger";
      remove.textContent = "Delete";
      remove.addEventListener("click", () =>
        deleteHabit(id).catch((e) => notifyError(e, "Failed to delete habit")),
      );

      row.appendChild(title);
      row.appendChild(tick);
      row.appendChild(remove);
      li.appendChild(row);
      elements.habitList.appendChild(li);
    });
  });
}
