import { statsApi, resetTasksDomain, resetEntireDatabase } from "../core/firebase.js";
import {
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  subscribeDailyTasks,
} from "../services/dailyTaskService.js";
import {
  createHabit,
  updateHabit,
  deleteHabit,
  subscribeHabits,
} from "../services/habitService.js";

function askDoubleConfirmation(label) {
  const confirmed = window.confirm(`Are you sure you want to ${label}?`);
  if (!confirmed) return false;
  const text = window.prompt("Type RESET to confirm");
  return text === "RESET";
}

export function initSettings(elements, notifyError) {
  let isDailyCreationOpen = false;
  let isHabitCreationOpen = false;

  function renderDailyCreationCard() {
    elements.settingsDailyTaskCreationArea.innerHTML = "";
    if (!isDailyCreationOpen) return;

    const card = document.createElement("article");
    card.className = "work-card creation-card";

    const title = document.createElement("input");
    title.placeholder = "Daily task title";

    const time = document.createElement("input");
    time.type = "time";
    time.value = "09:00";

    const description = document.createElement("input");
    description.placeholder = "Description optional";

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create";
    createBtn.addEventListener("click", async () => {
      try {
        await createDailyTask({
          title: title.value,
          time: time.value,
          condition: description.value,
        });
        isDailyCreationOpen = false;
        renderDailyCreationCard();
      } catch (error) {
        notifyError(error, "Failed to create daily task");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "btn-muted";
    cancelBtn.addEventListener("click", () => {
      isDailyCreationOpen = false;
      renderDailyCreationCard();
    });

    actions.append(createBtn, cancelBtn);
    card.append(title, time, description, actions);
    elements.settingsDailyTaskCreationArea.appendChild(card);
  }

  function renderHabitCreationCard() {
    elements.settingsHabitCreationArea.innerHTML = "";
    if (!isHabitCreationOpen) return;

    const card = document.createElement("article");
    card.className = "work-card creation-card";

    const title = document.createElement("input");
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
          time: time.value,
          condition: description.value,
        });
        isHabitCreationOpen = false;
        renderHabitCreationCard();
      } catch (error) {
        notifyError(error, "Failed to create habit");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "btn-muted";
    cancelBtn.addEventListener("click", () => {
      isHabitCreationOpen = false;
      renderHabitCreationCard();
    });

    actions.append(createBtn, cancelBtn);
    card.append(title, day, time, description, actions);
    elements.settingsHabitCreationArea.appendChild(card);
  }

  function renderDailyList(tasks = {}) {
    elements.settingsDailyTaskList.innerHTML = "";
    Object.entries(tasks).forEach(([id, task]) => {
      const li = document.createElement("li");
      const card = document.createElement("article");
      card.className = "work-card";

      const title = document.createElement("h4");
      title.className = "work-card-title";
      title.textContent = task.title;

      const meta = document.createElement("div");
      meta.className = "work-card-meta";
      const schedule = document.createElement("span");
      schedule.textContent = `Daily ${task.schedule?.time || "--:--"}`;
      meta.appendChild(schedule);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", async () => {
        const nextTitle = prompt("Title:", task.title || "");
        if (nextTitle === null) return;
        const nextTime = prompt("Time (HH:mm):", task.schedule?.time || "09:00");
        if (nextTime === null) return;
        const nextDescription = prompt("Description:", task.condition || "");
        if (nextDescription === null) return;
        try {
          await updateDailyTask(id, {
            title: nextTitle,
            time: nextTime,
            condition: nextDescription,
          });
        } catch (error) {
          notifyError(error, "Failed to edit daily task");
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", () =>
        deleteDailyTask(id).catch((error) => notifyError(error, "Failed to delete daily task")),
      );

      actions.append(editBtn, deleteBtn);
      card.append(title, meta, actions);
      li.appendChild(card);
      elements.settingsDailyTaskList.appendChild(li);
    });
  }

  function renderHabitList(habits = {}) {
    elements.settingsHabitList.innerHTML = "";
    Object.entries(habits).forEach(([id, habit]) => {
      const li = document.createElement("li");
      const card = document.createElement("article");
      card.className = "work-card";

      const title = document.createElement("h4");
      title.className = "work-card-title";
      title.textContent = habit.title;

      const meta = document.createElement("div");
      meta.className = "work-card-meta";
      const schedule = document.createElement("span");
      schedule.textContent = `D${habit.schedule?.dayOfWeek ?? "?"} ${habit.schedule?.time || "--:--"}`;
      meta.appendChild(schedule);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", async () => {
        const nextTitle = prompt("Title:", habit.title || "");
        if (nextTitle === null) return;
        const nextDay = prompt("Day of week (0-6):", String(habit.schedule?.dayOfWeek ?? 1));
        if (nextDay === null) return;
        const nextTime = prompt("Time (HH:mm):", habit.schedule?.time || "09:00");
        if (nextTime === null) return;
        const nextDescription = prompt("Description:", habit.condition || "");
        if (nextDescription === null) return;
        try {
          await updateHabit(id, {
            title: nextTitle,
            dayOfWeek: Number(nextDay),
            time: nextTime,
            condition: nextDescription,
          });
        } catch (error) {
          notifyError(error, "Failed to edit habit");
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", () =>
        deleteHabit(id).catch((error) => notifyError(error, "Failed to delete habit")),
      );

      actions.append(editBtn, deleteBtn);
      card.append(title, meta, actions);
      li.appendChild(card);
      elements.settingsHabitList.appendChild(li);
    });
  }

  elements.settingsAddDailyTaskBtn.addEventListener("click", () => {
    isDailyCreationOpen = !isDailyCreationOpen;
    renderDailyCreationCard();
  });

  elements.settingsAddHabitBtn.addEventListener("click", () => {
    isHabitCreationOpen = !isHabitCreationOpen;
    renderHabitCreationCard();
  });

  elements.resetTasksBtn.addEventListener("click", async () => {
    if (!askDoubleConfirmation("reset tasks")) return;
    try {
      await resetTasksDomain();
    } catch (error) {
      notifyError(error, "Failed to reset tasks");
    }
  });

  elements.resetStatsBtn.addEventListener("click", async () => {
    if (!askDoubleConfirmation("reset stats")) return;
    try {
      await statsApi.reset();
    } catch (error) {
      notifyError(error, "Failed to reset stats");
    }
  });

  elements.resetDatabaseBtn.addEventListener("click", async () => {
    if (!askDoubleConfirmation("reset the entire database")) return;
    try {
      await resetEntireDatabase();
    } catch (error) {
      notifyError(error, "Failed to reset database");
    }
  });

  return [
    subscribeDailyTasks((tasks) => renderDailyList(tasks || {})),
    subscribeHabits((habits) => renderHabitList(habits || {})),
  ];
}
