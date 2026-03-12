import {
  createDailyTask,
  completeDailyTask,
  deleteDailyTask,
  subscribeDailyTasks,
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
};

const KANBAN_COLUMNS = [
  { key: "backlog", elementKey: "kanbanBacklog" },
  { key: "todo", elementKey: "kanbanTodo" },
  { key: "in_progress", elementKey: "kanbanInProgress" },
  { key: "done", elementKey: "kanbanDone" },
];

function isBoardTask(task) {
  return task && task.type !== "daily" && task.type !== "habit";
}

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
    const tag = document.createElement("span");
    tag.textContent = item;
    meta.appendChild(tag);
  });
  card.appendChild(meta);

  if (actions.length) {
    const actionWrap = document.createElement("div");
    actionWrap.className = "item-actions";
    actions.forEach(({ label, onClick, className, type = "button" }) => {
      const btn = document.createElement("button");
      btn.type = type;
      btn.textContent = label;
      btn.className = className || "";
      btn.addEventListener("click", onClick);
      actionWrap.appendChild(btn);
    });
    card.appendChild(actionWrap);
  }

  return card;
}

function statusLabel(status, completed) {
  if (status) return status;
  return completed ? "done" : "backlog";
}

export function initTasks(elements, notifyError) {
  let taskMap = {};
  let dailyTasksById = {};
  let boardDropBound = false;
  let isDailyCreationOpen = false;

  function renderDailyCreationCard() {
    elements.dailyTaskCreationArea.innerHTML = "";

    if (!isDailyCreationOpen) return;

    const card = document.createElement("article");
    card.className = "work-card creation-card";

    const title = document.createElement("input");
    title.type = "text";
    title.placeholder = "Daily task title";

    const time = document.createElement("input");
    time.type = "time";
    time.value = "09:00";

    const desc = document.createElement("input");
    desc.type = "text";
    desc.placeholder = "Description optional";

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create";
    createBtn.addEventListener("click", async () => {
      try {
        await createDailyTask({
          title: title.value,
          time: time.value || "09:00",
          condition: desc.value,
        });
        isDailyCreationOpen = false;
        releaseCreationSlot("daily");
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
      releaseCreationSlot("daily");
      renderDailyCreationCard();
    });

    actions.appendChild(createBtn);
    actions.appendChild(cancelBtn);
    card.append(title, time, desc, actions);
    elements.dailyTaskCreationArea.appendChild(card);
    title.focus();
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
      const card = makeCard({
        title: task.title,
        description: task.description,
        metadata: [
          `Status: ${STATUS_LABELS[status] || status}`,
          `Created: ${formatDate(task.createdAt)}`,
        ],
      });
      card.draggable = true;
      card.dataset.taskId = id;
      card.classList.add("kanban-card");
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
      elements.dailyTaskList.innerHTML = "";
      const rows = Object.entries(dailyTasksById);
      let completedCount = 0;
      const today = new Date().toDateString();

      rows.forEach(([id, task]) => {
        const isDoneToday = task.lastCompleted === today;
        if (isDoneToday) completedCount += 1;

        const li = document.createElement("li");
        li.appendChild(
          makeCard({
            title: task.title,
            description: task.condition || "",
            metadata: [
              `Schedule: daily ${task.schedule?.time || "--:--"}`,
              `Created: ${formatDate(task.createdAt)}`,
              `Completed: ${task.completedAt ? formatDate(task.completedAt) : "-"}`,
            ],
            actions: [
              {
                label: "Complete",
                className: isDoneToday ? "btn-muted" : "",
                onClick: () =>
                  completeDailyTask(id).catch((e) =>
                    notifyError(e, "Failed to complete daily task"),
                  ),
              },
              {
                label: "Delete",
                className: "btn-danger",
                onClick: () =>
                  deleteDailyTask(id).catch((e) =>
                    notifyError(e, "Failed to delete daily task"),
                  ),
              },
            ],
          }),
        );
        elements.dailyTaskList.appendChild(li);
      });

      elements.dailyProgressText.textContent = `${completedCount}/${rows.length} completed`;
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
          li.appendChild(
            makeCard({
              title: task.title,
              description: task.description,
              metadata: [
                `Status: ${STATUS_LABELS[status] || status}`,
                `Created: ${formatDate(task.createdAt)}`,
                `Completed: ${task.completedAt ? formatDate(task.completedAt) : "-"}`,
              ],
              actions: [
                {
                  label: "Complete",
                  className: task.completed ? "btn-muted" : "",
                  onClick: () => completeTask(id, task),
                },
                { label: "Edit", onClick: () => editTask(id, task) },
                {
                  label: "Delete",
                  className: "btn-danger",
                  onClick: () =>
                    deleteTask(id).catch((e) => notifyError(e, "Failed to delete task")),
                },
              ],
            }),
          );
          elements.taskList.appendChild(li);
        });

      const grouped = {
        backlog: taskRows
          .filter(([, task]) => statusLabel(task.status, task.completed) === "backlog")
          .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0)),
        todo: taskRows
          .filter(([, task]) => statusLabel(task.status, task.completed) === "todo")
          .sort(([, a], [, b]) => (a.createdAt || 0) - (b.createdAt || 0)),
        in_progress: taskRows
          .filter(([, task]) => statusLabel(task.status, task.completed) === "in_progress")
          .sort(([, a], [, b]) => (a.createdAt || 0) - (b.createdAt || 0)),
        done: taskRows
          .filter(([, task]) => statusLabel(task.status, task.completed) === "done")
          .sort(([, a], [, b]) => (a.createdAt || 0) - (b.createdAt || 0)),
      };

      renderKanban(Object.fromEntries(Object.values(grouped).flat()));
    });
  }

  elements.addTaskBtn.addEventListener("click", addTask);
  elements.addDailyTaskBtn.addEventListener("click", () => {
    if (!isDailyCreationOpen && !takeCreationSlot("daily")) return;
    if (isDailyCreationOpen) {
      isDailyCreationOpen = false;
      releaseCreationSlot("daily");
    } else {
      isDailyCreationOpen = true;
    }
    renderDailyCreationCard();
  });

  return [loadDailyTasks(), loadTasks()];
}
