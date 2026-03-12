import { completeDailyTask, subscribeDailyTasks } from "../services/dailyTaskService.js";
import {
  createTask,
  updateTask,
  deleteTask,
  completeTask as markTaskComplete,
  subscribeTasks,
} from "../services/taskService.js";

function buildActions(actions) {
  const wrap = document.createElement("div");
  wrap.className = "item-actions";
  actions.forEach(({ label, onClick, className }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = className || "";
    btn.addEventListener("click", onClick);
    wrap.appendChild(btn);
  });
  return wrap;
}

function statusLabel(status, completed) {
  if (status) return status;
  return completed ? "done" : "new";
}

function renderTaskCard(task) {
  const status = statusLabel(task.status, task.completed);
  const schedule = task.schedule?.specificAt
    ? new Date(task.schedule.specificAt).toLocaleString()
    : "unscheduled";
  return `${task.title} • ${task.type || "task"} • ${task.priority || "medium"} • ${status} • ${schedule}${
    task.description ? ` — ${task.description}` : ""
  }`;
}

export function initTasks(elements, notifyError) {
  let taskMap = {};

  function renderKanban(tasks) {
    const columns = {
      new: elements.kanbanNew,
      progress: elements.kanbanProgress,
      done: elements.kanbanDone,
      canceled: elements.kanbanCanceled,
    };

    Object.values(columns).forEach((el) => {
      if (el) el.innerHTML = "";
    });

    Object.entries(tasks).forEach(([id, task]) => {
      const status = statusLabel(task.status, task.completed);
      const bucket = columns[status] || columns.new;
      if (!bucket) return;

      const li = document.createElement("li");
      li.textContent = `${task.title} (${task.priority || "medium"})`;
      li.draggable = true;
      li.dataset.taskId = id;
      li.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", id);
      });
      bucket.appendChild(li);
    });

    Object.entries(columns).forEach(([nextStatus, column]) => {
      if (!column) return;
      column.addEventListener("dragover", (event) => event.preventDefault());
      column.addEventListener("drop", async (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/plain");
        if (!taskId || !taskMap[taskId]) return;
        try {
          await updateTask(taskId, { status: nextStatus });
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
        type: elements.taskTypeInput.value,
        priority: elements.taskPriorityInput.value,
        schedule: elements.taskScheduleInput.value,
      });
      elements.taskInput.value = "";
      elements.taskDescriptionInput.value = "";
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

    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        description,
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
      elements.dailyTaskList.innerHTML = "";
      const rows = tasks ? Object.entries(tasks) : [];
      let completedCount = 0;
      const today = new Date().toDateString();

      rows.forEach(([id, task]) => {
        const li = document.createElement("li");
        const title = document.createElement("span");
        title.textContent = task.title;
        li.appendChild(title);
        const isDoneToday = task.lastCompleted === today;
        if (isDoneToday) completedCount += 1;
        li.appendChild(
          buildActions([
            {
              label: "Complete",
              className: isDoneToday ? "btn-muted" : "",
              onClick: () =>
                completeDailyTask(id).catch((e) => notifyError(e, "Failed to complete daily task")),
            },
          ]),
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

      Object.entries(tasks)
        .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
        .forEach(([id, task]) => {
          const li = document.createElement("li");
          const text = document.createElement("div");
          text.className = "item-main";
          text.textContent = renderTaskCard(task);
          if (task.completed || task.status === "done") text.classList.add("is-completed");
          li.appendChild(text);
          li.appendChild(
            buildActions([
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
            ]),
          );
          elements.taskList.appendChild(li);
        });

      renderKanban(tasks);
    });
  }

  elements.addTaskBtn.addEventListener("click", addTask);

  return [loadDailyTasks(), loadTasks()];
}
