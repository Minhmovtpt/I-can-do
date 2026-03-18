import {
  completeDailyTask,
  subscribeDailyTasks,
  resetDailyTasksForToday,
} from "../services/dailyTaskService.js";
import { completeHabit, subscribeHabits, resetHabitsForToday } from "../services/habitService.js";
import {
  buildTaskTagsFromInputs,
  createTask,
  updateTask,
  deleteTask,
  completeTask as markTaskComplete,
  subscribeTasks,
} from "../services/taskService.js";
import {
  TASK_PRIORITY_MULTIPLIERS,
  TASK_TAG_LAYERS,
  getDurationMultiplier,
} from "../core/workItemModel.js";
import { getScheduledDays, isScheduledOnDate, toDayString } from "../core/habitLogic.js";

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  failed: "Failed",
};

const PRIORITY_LABELS = {
  critical: `Critical x${TASK_PRIORITY_MULTIPLIERS.critical}`,
  important: `Important x${TASK_PRIORITY_MULTIPLIERS.important}`,
  optional: `Optional x${TASK_PRIORITY_MULTIPLIERS.optional}`,
};

const KANBAN_COLUMNS = [
  { key: "todo", elementKey: "kanbanBacklog" },
  { key: "in_progress", elementKey: "kanbanTodo" },
  { key: "completed", elementKey: "kanbanInProgress" },
  { key: "failed", elementKey: "kanbanDone" },
];

const STATUS_SEQUENCE = ["todo", "in_progress", "completed", "failed"];

function isBoardTask(task) {
  return task && !task.type;
}

function formatDate(ts) {
  return ts ? new Date(ts).toLocaleString() : "-";
}

function formatScheduleForInput(schedule) {
  if (!schedule?.specificAt) return "";
  const date = new Date(schedule.specificAt);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatRoutineDays(task) {
  const days = getScheduledDays(task.schedule);
  if (!days.length) return "Every day";
  return `Days: ${days.join(",")}`;
}

function formatTaskTags(task) {
  return TASK_TAG_LAYERS.map((layer) => `${layer}: ${task.tags?.[layer] || "-"}`).join(" · ");
}

function formatStats(stats = {}) {
  const entries = Object.entries(stats);
  if (!entries.length) return "-";
  return entries.map(([stat, value]) => `${stat.toUpperCase()} +${value}`).join(" · ");
}

function makeTrackingCard({ title, time, subtitle, isDoneToday, onComplete }) {
  const card = document.createElement("article");
  card.className = "work-card";

  const heading = document.createElement("h4");
  heading.className = "work-card-title";
  heading.textContent = title;

  const timeText = document.createElement("p");
  timeText.className = "work-card-time";
  timeText.textContent = `${time || "--:--"} · ${subtitle}`;

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

function makeBoardCard({ task, taskId, onMove }) {
  const status = task.status || "todo";
  const card = document.createElement("article");
  card.className = "work-card kanban-card";
  card.draggable = status !== "completed" && status !== "failed";
  card.dataset.taskId = taskId;

  const heading = document.createElement("h4");
  heading.className = "work-card-title";
  heading.textContent = task.title;

  const statusMeta = document.createElement("div");
  statusMeta.className = "work-card-meta";
  const badge = document.createElement("span");
  badge.textContent = `[${STATUS_LABELS[status] || status}]`;
  statusMeta.appendChild(badge);

  const details = document.createElement("p");
  details.className = "work-card-time";
  details.textContent = `${task.durationMinutes || 0} min · ${PRIORITY_LABELS[task.priority] || task.priority}`;

  const arrows = document.createElement("div");
  arrows.className = "kanban-arrows";

  const prev = document.createElement("button");
  prev.textContent = "←";
  prev.type = "button";
  prev.className = "btn-muted";

  const next = document.createElement("button");
  next.textContent = "→";
  next.type = "button";
  next.className = "btn-muted";

  const index = STATUS_SEQUENCE.indexOf(status);
  prev.disabled = index <= 0;
  next.disabled = index === -1 || index >= STATUS_SEQUENCE.length - 1;

  prev.addEventListener("click", () => {
    if (index <= 0) return;
    onMove(STATUS_SEQUENCE[index - 1]);
  });
  next.addEventListener("click", () => {
    if (index === -1 || index >= STATUS_SEQUENCE.length - 1) return;
    onMove(STATUS_SEQUENCE[index + 1]);
  });

  arrows.append(prev, next);
  card.append(heading, statusMeta, details, arrows);

  return card;
}

function parseDuration(input) {
  return Number(input || 0);
}

export function initTasks(elements, notifyError) {
  let taskMap = {};
  let dailyTasksById = {};
  let habitsById = {};
  let boardDropBound = false;
  let activeDailyTab = "active";

  function updateTabState(tabsRoot, activeTab) {
    tabsRoot.querySelectorAll("button[data-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === activeTab);
    });
  }

  function getRoutineRows() {
    const today = new Date();

    return [
      ...Object.entries(dailyTasksById).map(([id, task]) => ({ id, task, source: "daily" })),
      ...Object.entries(habitsById).map(([id, task]) => ({ id, task, source: "habit" })),
    ].filter(({ task }) => isScheduledOnDate(task, today));
  }

  function renderDailyTracking() {
    elements.dailyTaskList.innerHTML = "";
    const rows = getRoutineRows();
    const todayKey = toDayString(new Date());
    let completedCount = 0;

    rows.forEach(({ id, task, source }) => {
      const isDoneToday = task.lastCompleted === todayKey;
      if (isDoneToday) completedCount += 1;

      const hiddenByTab =
        (activeDailyTab === "active" && isDoneToday) ||
        (activeDailyTab === "completed" && !isDoneToday);
      if (hiddenByTab) return;

      const li = document.createElement("li");
      li.appendChild(
        makeTrackingCard({
          title: task.title,
          time: task.schedule?.time,
          subtitle: formatRoutineDays(task),
          isDoneToday,
          onComplete: () => {
            const work =
              source === "habit"
                ? completeHabit(id, task).catch((e) => notifyError(e, "Failed to complete routine"))
                : completeDailyTask(id).catch((e) => notifyError(e, "Failed to complete routine"));
            return work;
          },
        }),
      );
      elements.dailyTaskList.appendChild(li);
    });

    elements.dailyProgressText.textContent = `${completedCount}/${rows.length} completed`;
  }

  async function moveTask(taskId, task, nextStatus) {
    try {
      if (nextStatus === "completed") {
        await markTaskComplete(taskId, task);
        return;
      }
      await updateTask(taskId, { status: nextStatus });
    } catch (error) {
      notifyError(error, "Failed to update task status");
    }
  }

  function renderKanban(tasks) {
    const columns = KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col.key] = elements[col.elementKey];
      return acc;
    }, {});

    Object.values(columns).forEach((el) => {
      if (el) el.innerHTML = "";
    });

    const taskRows = Object.entries(tasks).filter(
      ([, task]) => isBoardTask(task) && task.status !== "skipped",
    );

    taskRows.forEach(([id, task]) => {
      const status = task.status || "todo";
      const bucket = columns[status] || columns.todo;
      if (!bucket) return;

      const li = document.createElement("li");
      const card = makeBoardCard({
        task,
        taskId: id,
        onMove: async (nextStatus) => moveTask(id, task, nextStatus),
      });
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", id);
      });
      li.appendChild(card);
      bucket.appendChild(li);
    });

    if (boardDropBound) return;
    boardDropBound = true;

    KANBAN_COLUMNS.forEach(({ key, elementKey }) => {
      const column = elements[elementKey];
      if (!column) return;
      column.addEventListener("dragover", (event) => event.preventDefault());
      column.addEventListener("drop", async (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/plain");
        if (!taskId || !taskMap[taskId]) return;
        await moveTask(taskId, taskMap[taskId], key);
      });
    });
  }

  function collectTaskInput() {
    return {
      title: elements.taskInput.value,
      durationMinutes: parseDuration(elements.taskDurationInput.value),
      priority: elements.taskPriorityInput.value,
      tags: buildTaskTagsFromInputs({
        domain: elements.taskDomainInput.value,
        nature: elements.taskNatureInput.value,
        intent: elements.taskIntentInput.value,
      }),
      schedule: elements.taskScheduleInput.value,
    };
  }

  function resetTaskForm() {
    elements.taskInput.value = "";
    elements.taskDurationInput.value = "60";
    elements.taskScheduleInput.value = "";
    elements.taskPriorityInput.value = "important";
    elements.taskDomainInput.value = "work";
    elements.taskNatureInput.value = "deep_work";
    elements.taskIntentInput.value = "build";
  }

  async function addTask() {
    try {
      await createTask(collectTaskInput());
      resetTaskForm();
      elements.taskCreationPanel.classList.remove("is-open");
    } catch (error) {
      notifyError(error, "Failed to add task");
    }
  }

  async function editTask(taskId, task) {
    const title = prompt("Edit task title:", task.title || "");
    if (title === null) return;
    const durationMinutes = prompt("Edit duration in minutes:", String(task.durationMinutes || 60));
    if (durationMinutes === null) return;
    const domain = prompt("Edit domain tag:", task.tags?.domain || "work");
    if (domain === null) return;
    const nature = prompt("Edit nature tag:", task.tags?.nature || "deep_work");
    if (nature === null) return;
    const intent = prompt("Edit intent tag:", task.tags?.intent || "build");
    if (intent === null) return;
    const priority = prompt("Edit priority:", task.priority || "important");
    if (priority === null) return;
    const schedule = prompt(
      "Edit schedule (YYYY-MM-DDTHH:mm, blank to clear):",
      formatScheduleForInput(task.schedule),
    );
    if (schedule === null) return;

    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        durationMinutes: Number(durationMinutes),
        tags: {
          domain: domain.trim() || task.tags?.domain,
          nature: nature.trim() || task.tags?.nature,
          intent: intent.trim() || task.tags?.intent,
        },
        priority: priority.trim() || task.priority,
        schedule: schedule.trim() ? schedule.trim() : null,
      });
    } catch (error) {
      notifyError(error, "Failed to update task");
    }
  }

  async function completeTask(taskId, task) {
    if (task.status === "completed") return;
    try {
      await markTaskComplete(taskId, task);
    } catch (error) {
      notifyError(error, "Failed to complete task");
    }
  }

  function loadDailyTasks() {
    return subscribeDailyTasks((tasks) => {
      dailyTasksById = tasks || {};
      renderDailyTracking();
    });
  }

  function loadHabits() {
    return subscribeHabits((habits) => {
      habitsById = habits || {};
      renderDailyTracking();
    });
  }

  function loadTasks() {
    return subscribeTasks((tasks) => {
      taskMap = tasks || {};
      elements.taskList.innerHTML = "";
      if (!tasks) {
        renderKanban({});
        return;
      }

      const taskRows = Object.entries(tasks).filter(([, task]) => isBoardTask(task));

      taskRows
        .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
        .forEach(([id, task]) => {
          const status = task.status || "todo";
          const li = document.createElement("li");

          const card = document.createElement("article");
          card.className = "work-card";
          const h = document.createElement("h4");
          h.className = "work-card-title";
          h.textContent = task.title;
          const meta = document.createElement("div");
          meta.className = "work-card-meta";
          [
            `Status: ${STATUS_LABELS[status] || status}`,
            `Priority: ${PRIORITY_LABELS[task.priority] || task.priority}`,
            `Duration: ${task.durationMinutes || 0} min (x${getDurationMultiplier(task.durationMinutes || 0)})`,
            `Tags: ${formatTaskTags(task)}`,
            `Base Stats: ${formatStats(task.baseStats)}`,
            `Reward: ${formatStats(task.reward)}`,
            `Capped Stats: ${task.omittedStats?.length ? task.omittedStats.map((stat) => stat.toUpperCase()).join(", ") : "-"}`,
            `Scheduled: ${task.schedule?.specificAt ? formatDate(task.schedule.specificAt) : "-"}`,
            `Created: ${formatDate(task.createdAt)}`,
            `Completed: ${task.completedAt ? formatDate(task.completedAt) : "-"}`,
          ].forEach((m) => {
            const s = document.createElement("span");
            s.textContent = m;
            meta.appendChild(s);
          });

          const actions = document.createElement("div");
          actions.className = "item-actions";
          [
            {
              label: "Complete",
              className: task.status === "completed" ? "btn-muted" : "",
              onClick: () => completeTask(id, task),
            },
            { label: "Edit", onClick: () => editTask(id, task) },
            {
              label: "Skip",
              className: "btn-muted",
              onClick: () =>
                updateTask(id, { status: "skipped" }).catch((e) =>
                  notifyError(e, "Failed to skip task"),
                ),
            },
            {
              label: "Fail",
              className: "btn-danger",
              onClick: () =>
                updateTask(id, { status: "failed" }).catch((e) =>
                  notifyError(e, "Failed to fail task"),
                ),
            },
            {
              label: "Delete",
              className: "btn-danger",
              onClick: () => deleteTask(id).catch((e) => notifyError(e, "Failed to delete task")),
            },
          ].forEach(({ label, className, onClick }) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.className = className || "";
            btn.addEventListener("click", onClick);
            actions.appendChild(btn);
          });

          card.append(h, meta, actions);
          li.appendChild(card);
          elements.taskList.appendChild(li);
        });

      renderKanban(Object.fromEntries(taskRows));
    });
  }

  function scheduleDailyReset() {
    async function runReset() {
      try {
        await Promise.all([resetDailyTasksForToday(), resetHabitsForToday()]);
      } catch (error) {
        notifyError(error, "Failed to reset daily tracking");
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

  elements.addTaskBtn.addEventListener("click", addTask);
  elements.dailyTrackingTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    activeDailyTab = button.dataset.tab;
    updateTabState(elements.dailyTrackingTabs, activeDailyTab);
    renderDailyTracking();
  });

  scheduleDailyReset();

  return [loadDailyTasks(), loadHabits(), loadTasks()];
}
