import {
  completeDailyTask,
  subscribeDailyTasks,
  resetDailyTasksForToday,
} from "../services/dailyTaskService.js";
import {
  createTask,
  updateTask,
  deleteTask,
  completeTask as markTaskComplete,
  subscribeTasks,
} from "../services/taskService.js";

const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const KANBAN_COLUMNS = [
  { key: "backlog", elementKey: "kanbanBacklog" },
  { key: "todo", elementKey: "kanbanTodo" },
  { key: "in_progress", elementKey: "kanbanInProgress" },
  { key: "done", elementKey: "kanbanDone" },
];

const STATUS_SEQUENCE = ["backlog", "todo", "in_progress", "done"];

function isBoardTask(task) {
  return task && task.type !== "daily" && task.type !== "habit";
}

function formatDate(ts) {
  return ts ? new Date(ts).toLocaleString() : "-";
}

function statusLabel(status, completed) {
  if (status) return status;
  return completed ? "done" : "backlog";
}

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

function makeBoardCard({ task, taskId, onMove }) {
  const status = statusLabel(task.status, task.completed);
  const card = document.createElement("article");
  card.className = "work-card kanban-card";
  card.draggable = true;
  card.dataset.taskId = taskId;

  const heading = document.createElement("h4");
  heading.className = "work-card-title";
  heading.textContent = task.title;

  const statusMeta = document.createElement("div");
  statusMeta.className = "work-card-meta";
  const badge = document.createElement("span");
  badge.textContent = `[${STATUS_LABELS[status] || status}]`;
  statusMeta.appendChild(badge);

  const created = document.createElement("p");
  created.className = "work-card-time";
  created.textContent = `Created: ${formatDate(task.createdAt)}`;

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
  card.append(heading, statusMeta, created, arrows);

  return card;
}

export function initTasks(elements, notifyError) {
  let taskMap = {};
  let dailyTasksById = {};
  let boardDropBound = false;
  let activeDailyTab = "active";

  function updateTabState(tabsRoot, activeTab) {
    tabsRoot.querySelectorAll("button[data-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === activeTab);
    });
  }

  function renderDailyTracking() {
    elements.dailyTaskList.innerHTML = "";
    const rows = Object.entries(dailyTasksById);
    const today = new Date().toDateString();
    let completedCount = 0;

    rows.forEach(([id, task]) => {
      const isDoneToday = task.lastCompleted === today;
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
          isDoneToday,
          onComplete: () =>
            completeDailyTask(id).catch((e) => notifyError(e, "Failed to complete daily task")),
        }),
      );
      elements.dailyTaskList.appendChild(li);
    });

    elements.dailyProgressText.textContent = `${completedCount}/${rows.length} completed`;
  }

  function renderKanban(tasks) {
    const columns = KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col.key] = elements[col.elementKey];
      return acc;
    }, {});

    Object.values(columns).forEach((el) => {
      if (el) el.innerHTML = "";
    });

    const taskRows = Object.entries(tasks).filter(([, task]) => isBoardTask(task));

    taskRows.forEach(([id, task]) => {
      const status = statusLabel(task.status, task.completed);
      const bucket = columns[status] || columns.backlog;
      if (!bucket) return;

      const li = document.createElement("li");
      const card = makeBoardCard({
        task,
        taskId: id,
        onMove: async (nextStatus) => {
          try {
            await updateTask(id, { status: nextStatus });
          } catch (error) {
            notifyError(error, "Failed to update task status");
          }
        },
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
        try {
          await updateTask(taskId, { status: key });
        } catch (error) {
          notifyError(error, "Failed to update task status");
        }
      });
    });
  }

  async function addTask() {
    try {
      await createTask({
        title: elements.taskInput.value,
        description: elements.taskDescriptionInput.value,
        condition: elements.taskConditionInput.value,
        type: elements.taskTypeInput.value,
        priority: elements.taskPriorityInput.value,
        schedule: elements.taskScheduleInput.value,
      });
      elements.taskInput.value = "";
      elements.taskDescriptionInput.value = "";
      elements.taskConditionInput.value = "";
      elements.taskScheduleInput.value = "";
    } catch (error) {
      notifyError(error, "Failed to add task");
    }
  }

  async function editTask(taskId, task) {
    const title = prompt("Edit task title:", task.title || "");
    if (title === null) return;
    const description = prompt("Edit task description:", task.description || "");
    if (description === null) return;
    const condition = prompt("Edit condition:", task.condition || "");
    if (condition === null) return;

    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        description,
        condition,
      });
    } catch (error) {
      notifyError(error, "Failed to update task");
    }
  }

  async function completeTask(taskId, task) {
    if (task.completed) return;
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
          const status = statusLabel(task.status, task.completed);
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
              className: task.completed ? "btn-muted" : "",
              onClick: () => completeTask(id, task),
            },
            { label: "Edit", onClick: () => editTask(id, task) },
            {
              label: "Delete",
              className: "btn-danger",
              onClick: () => deleteTask(id).catch((e) => notifyError(e, "Failed to delete task")),
            },
            {
              label: "Cancel",
              className: "btn-muted",
              onClick: () =>
                updateTask(id, { status: "cancelled" }).catch((e) =>
                  notifyError(e, "Failed to cancel task"),
                ),
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

      const grouped = {
        backlog: taskRows.filter(
          ([, task]) => statusLabel(task.status, task.completed) === "backlog",
        ),
        todo: taskRows.filter(([, task]) => statusLabel(task.status, task.completed) === "todo"),
        in_progress: taskRows.filter(
          ([, task]) => statusLabel(task.status, task.completed) === "in_progress",
        ),
        done: taskRows.filter(([, task]) => statusLabel(task.status, task.completed) === "done"),
      };

      renderKanban(Object.fromEntries(Object.values(grouped).flat()));
    });
  }

  function scheduleDailyReset() {
    async function runReset() {
      try {
        await resetDailyTasksForToday();
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

  return [loadDailyTasks(), loadTasks()];
}
