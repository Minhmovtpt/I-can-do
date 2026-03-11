import { dailyTasksApi, tasksApi } from "./firebase.js";
import { applyReward } from "./rewardEngine.js";
import { createTask, updateTask, deleteTask, completeTask as markTaskComplete } from "./services/taskService.js";

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

export function initTasks(elements, notifyError) {
  async function completeDailyTask(taskId) {
    try {
      const task = await dailyTasksApi.getById(taskId);
      if (!task) return;
      const today = new Date().toDateString();
      if (task.lastCompleted === today) return alert("Already completed today");
      await applyReward(task.reward || {}, { source: task.title || "Daily Task" });
      await dailyTasksApi.patchById(taskId, { lastCompleted: today });
    } catch (error) {
      notifyError(error, "Failed to complete daily task");
    }
  }

  async function addTask() {
    try {
      await createTask({
        title: elements.taskInput.value,
        description: elements.taskDescriptionInput.value
      });
      elements.taskInput.value = "";
      elements.taskDescriptionInput.value = "";
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
        description
      });
    } catch (error) {
      notifyError(error, "Failed to update task");
    }
  }

  async function completeTask(taskId, task) {
    if (task.completed) return;
    try {
      await applyReward(task.reward || { exp: 20 }, { source: task.title || "Task" });
      await markTaskComplete(taskId);
    } catch (error) {
      notifyError(error, "Failed to complete task");
    }
  }

  function loadDailyTasks() {
    return dailyTasksApi.subscribe((tasks) => {
      elements.dailyTaskList.innerHTML = "";
      if (!tasks) return;
      Object.entries(tasks).forEach(([id, task]) => {
        const li = document.createElement("li");
        const title = document.createElement("span");
        title.textContent = task.title;
        li.appendChild(title);
        li.appendChild(buildActions([{ label: "Complete", onClick: () => completeDailyTask(id) }]));
        elements.dailyTaskList.appendChild(li);
      });
    });
  }

  function loadTasks() {
    return tasksApi.subscribe((tasks) => {
      elements.taskList.innerHTML = "";
      if (!tasks) return;

      Object.entries(tasks)
        .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
        .forEach(([id, task]) => {
          const li = document.createElement("li");
          const text = document.createElement("div");
          text.className = "item-main";
          text.textContent = `${task.title}${task.description ? ` — ${task.description}` : ""}`;
          if (task.completed) text.classList.add("is-completed");
          li.appendChild(text);
          li.appendChild(
            buildActions([
              { label: "Complete", className: task.completed ? "btn-muted" : "", onClick: () => completeTask(id, task) },
              { label: "Edit", onClick: () => editTask(id, task) },
              { label: "Delete", className: "btn-danger", onClick: () => deleteTask(id).catch((e) => notifyError(e, "Failed to delete task")) }
            ])
          );
          elements.taskList.appendChild(li);
        });
    });
  }

  elements.addTaskBtn.addEventListener("click", addTask);

  return [loadDailyTasks(), loadTasks()];
}
