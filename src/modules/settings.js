import { statsApi, resetTasksDomain, resetEntireDatabase } from "../core/firebase.js";
import {
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  subscribeDailyTasks,
} from "../services/dailyTaskService.js";
import { updateHabit, deleteHabit, subscribeHabits } from "../services/habitService.js";
import { getScheduledDays } from "../core/habitLogic.js";

const DAY_OPTIONS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
];

function askDoubleConfirmation(label) {
  const confirmed = window.confirm(`Are you sure you want to ${label}?`);
  if (!confirmed) return false;
  const text = window.prompt("Type RESET to confirm");
  return text === "RESET";
}

function formatRoutineSchedule(item) {
  const time = item.schedule?.time || "--:--";
  const days = getScheduledDays(item.schedule);
  if (!days.length) return `Every day · ${time}`;

  const labels = DAY_OPTIONS.filter(([value]) => days.includes(value)).map(([, label]) => label);
  return `${labels.join(", ")} · ${time}`;
}

function makeDaySelector(selectedDays = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "day-selector";
  const selected = new Set(selectedDays.map((day) => Number(day)));

  DAY_OPTIONS.forEach(([value, label]) => {
    const chip = document.createElement("label");
    chip.className = "day-chip";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(value);
    input.checked = selected.has(value);

    const text = document.createElement("span");
    text.textContent = label;

    chip.append(input, text);
    wrapper.appendChild(chip);
  });

  return wrapper;
}

function readSelectedDays(root) {
  return [...root.querySelectorAll('input[type="checkbox"]:checked')].map((input) =>
    Number(input.value),
  );
}

export function initSettings(elements, notifyError) {
  let isDailyCreationOpen = false;
  let dailyTasksById = {};
  let habitsById = {};

  function renderDailyCreationCard() {
    elements.settingsDailyTaskCreationArea.innerHTML = "";
    if (!isDailyCreationOpen) return;

    const card = document.createElement("article");
    card.className = "work-card creation-card";

    const title = document.createElement("input");
    title.placeholder = "Task title";

    const time = document.createElement("input");
    time.type = "time";
    time.value = "09:00";

    const dayHint = document.createElement("p");
    dayHint.className = "field-hint";
    dayHint.textContent = "Pick days to run. Leave all unchecked for every day.";

    const days = makeDaySelector();

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
          daysOfWeek: readSelectedDays(days),
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
    card.append(title, time, dayHint, days, description, actions);
    elements.settingsDailyTaskCreationArea.appendChild(card);
  }

  async function editRoutine(id, item, source) {
    const nextTitle = prompt("Title:", item.title || "");
    if (nextTitle === null) return;
    const nextTime = prompt("Time (HH:mm):", item.schedule?.time || "09:00");
    if (nextTime === null) return;
    const nextDays = prompt(
      "Days of week (comma separated 0-6, blank = every day):",
      getScheduledDays(item.schedule).join(","),
    );
    if (nextDays === null) return;
    const nextDescription = prompt("Description:", item.condition || "");
    if (nextDescription === null) return;

    const daysOfWeek = nextDays
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value));

    try {
      if (source === "habit") {
        if (daysOfWeek.length > 1) {
          throw new Error(
            "Legacy habits can only keep one scheduled day. Create a daily task for multi-day routines.",
          );
        }
        await updateHabit(id, {
          title: nextTitle,
          dayOfWeek: daysOfWeek[0] ?? item.schedule?.dayOfWeek ?? 1,
          time: nextTime,
          condition: nextDescription,
        });
        return;
      }

      await updateDailyTask(id, {
        title: nextTitle,
        time: nextTime,
        daysOfWeek,
        condition: nextDescription,
      });
    } catch (error) {
      notifyError(error, "Failed to edit routine");
    }
  }

  function renderRoutineList() {
    elements.settingsDailyTaskList.innerHTML = "";

    const merged = [
      ...Object.entries(dailyTasksById).map(([id, task]) => [id, task, "daily"]),
      ...Object.entries(habitsById).map(([id, task]) => [id, task, "habit"]),
    ].sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));

    merged.forEach(([id, task, source]) => {
      const li = document.createElement("li");
      const card = document.createElement("article");
      card.className = "work-card";

      const title = document.createElement("h4");
      title.className = "work-card-title";
      title.textContent = task.title;

      const meta = document.createElement("div");
      meta.className = "work-card-meta";
      const schedule = document.createElement("span");
      schedule.textContent = formatRoutineSchedule(task);
      meta.appendChild(schedule);

      const desc = document.createElement("p");
      desc.className = "work-card-time";
      desc.textContent =
        task.condition || (source === "habit" ? "Imported from habits" : "No description");

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => editRoutine(id, task, source));

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", () => {
        const work = source === "habit" ? deleteHabit(id) : deleteDailyTask(id);
        work.catch((error) => notifyError(error, "Failed to delete routine"));
      });

      actions.append(editBtn, deleteBtn);
      card.append(title, meta, desc, actions);
      li.appendChild(card);
      elements.settingsDailyTaskList.appendChild(li);
    });
  }

  elements.settingsAddDailyTaskBtn.addEventListener("click", () => {
    isDailyCreationOpen = !isDailyCreationOpen;
    renderDailyCreationCard();
  });

  elements.resetTasksBtn.addEventListener("click", async () => {
    if (!askDoubleConfirmation("reset all task data")) return;
    try {
      await resetTasksDomain();
    } catch (error) {
      notifyError(error, "Failed to reset task data");
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

  renderDailyCreationCard();

  return [
    subscribeDailyTasks((tasks) => {
      dailyTasksById = tasks || {};
      renderRoutineList();
    }),
    subscribeHabits((habits) => {
      habitsById = habits || {};
      renderRoutineList();
    }),
  ];
}
