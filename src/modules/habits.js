import {
  completeHabit,
  createHabit,
  deleteHabit,
  subscribeHabits,
} from "../services/habitService.js";

function formatDate(ts) {
  return ts ? new Date(ts).toLocaleString() : "-";
}

function takeCreationSlot(owner) {
  if (window.__activeCreationCardOwner && window.__activeCreationCardOwner !== owner) {
    return false;
  }
  window.__activeCreationCardOwner = owner;
  return true;
}

function releaseCreationSlot(owner) {
  if (window.__activeCreationCardOwner === owner) {
    window.__activeCreationCardOwner = null;
  }
}

function makeCard({ title, description = "", metadata = [], actions = [] }) {
  const card = document.createElement("article");
  card.className = "work-card";

  const heading = document.createElement("h4");
  heading.className = "work-card-title";
  heading.textContent = title;
  card.appendChild(heading);

  if (description) {
    const desc = document.createElement("p");
    desc.className = "work-card-description";
    desc.textContent = description;
    card.appendChild(desc);
  }

  const meta = document.createElement("div");
  meta.className = "work-card-meta";
  metadata.forEach((item) => {
    const row = document.createElement("span");
    row.textContent = item;
    meta.appendChild(row);
  });
  card.appendChild(meta);

  const actionWrap = document.createElement("div");
  actionWrap.className = "item-actions";
  actions.forEach(({ label, onClick, className }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = className || "";
    btn.addEventListener("click", onClick);
    actionWrap.appendChild(btn);
  });
  card.appendChild(actionWrap);

  return card;
}

export function initHabits(elements, notifyError) {
  let isCreationOpen = false;

  function renderCreationCard() {
    elements.habitCreationArea.innerHTML = "";
    if (!isCreationOpen) return;

    const card = document.createElement("article");
    card.className = "work-card creation-card";

    const title = document.createElement("input");
    title.type = "text";
    title.placeholder = "Habit title";

    const day = document.createElement("select");
    [
      [1, "Monday"],
      [2, "Tuesday"],
      [3, "Wednesday"],
      [4, "Thursday"],
      [5, "Friday"],
      [6, "Saturday"],
      [0, "Sunday"],
    ].forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = String(value);
      opt.textContent = label;
      day.appendChild(opt);
    });

    const time = document.createElement("input");
    time.type = "time";
    time.value = "09:00";

    const description = document.createElement("input");
    description.type = "text";
    description.placeholder = "Description optional";

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create";
    createBtn.addEventListener("click", async () => {
      try {
        await createHabit({
          title: title.value,
          dayOfWeek: Number(day.value),
          time: time.value || "09:00",
          condition: description.value,
        });
        isCreationOpen = false;
        releaseCreationSlot("habit");
        renderCreationCard();
      } catch (error) {
        notifyError(error, "Failed to create habit");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "btn-muted";
    cancelBtn.addEventListener("click", () => {
      isCreationOpen = false;
      releaseCreationSlot("habit");
      renderCreationCard();
    });

    actions.append(createBtn, cancelBtn);
    card.append(title, day, time, description, actions);
    elements.habitCreationArea.appendChild(card);
    title.focus();
  }

  async function onCompleteHabit(habitId, habit) {
    try {
      await completeHabit(habitId, habit);
    } catch (error) {
      notifyError(error, "Failed to complete habit");
    }
  }

  elements.addHabitBtn.addEventListener("click", () => {
    if (!isCreationOpen && !takeCreationSlot("habit")) return;
    if (isCreationOpen) {
      isCreationOpen = false;
      releaseCreationSlot("habit");
    } else {
      isCreationOpen = true;
    }
    renderCreationCard();
  });

  return subscribeHabits((habits) => {
    elements.habitList.innerHTML = "";
    if (!habits) return;

    Object.entries(habits).forEach(([id, habit]) => {
      const isDoneToday = habit.lastCompleted === new Date().toDateString();
      const li = document.createElement("li");
      li.appendChild(
        makeCard({
          title: habit.title,
          description: habit.condition || "",
          metadata: [
            `Schedule: weekly D${habit.schedule?.dayOfWeek ?? "?"} ${habit.schedule?.time || ""}`,
            `Streak: ${habit.streak || 0}`,
            `Created: ${formatDate(habit.createdAt)}`,
            `Completed: ${habit.completedAt ? formatDate(habit.completedAt) : "-"}`,
          ],
          actions: [
            {
              label: isDoneToday ? "Completed" : "Complete",
              className: isDoneToday ? "btn-muted" : "",
              onClick: () => onCompleteHabit(id, habit),
            },
            {
              label: "Delete",
              className: "btn-danger",
              onClick: () =>
                deleteHabit(id).catch((e) => notifyError(e, "Failed to delete habit")),
            },
          ],
        }),
      );
      elements.habitList.appendChild(li);
    });
  });
}
