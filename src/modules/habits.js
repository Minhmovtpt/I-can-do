import { completeHabit, subscribeHabits } from "../services/habitService.js";

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
      const title = document.createElement("span");
      title.textContent = `${habit.title} (streak: ${habit.streak || 0})`;
      li.appendChild(title);
      li.appendChild(buildActions([{ label: "Complete", onClick: () => onCompleteHabit(id, habit) }]));
      elements.habitList.appendChild(li);
    });
  });
}
