import {
  getPaths,
  subscribe,
  tasksApi,
  notesApi,
  financeApi,
  dailyTasksApi,
  habitsApi,
  focusApi,
  activityApi
} from "./firebaseService.js";
import { applyReward } from "./rewardEngine.js";

const elements = {
  atk: document.getElementById("atk"),
  int: document.getElementById("int"),
  disc: document.getElementById("disc"),
  cre: document.getElementById("cre"),
  end: document.getElementById("end"),
  foc: document.getElementById("foc"),
  wis: document.getElementById("wis"),
  level: document.getElementById("level"),
  exp: document.getElementById("exp"),
  statBars: {
    atk: document.getElementById("bar-atk"),
    int: document.getElementById("bar-int"),
    disc: document.getElementById("bar-disc"),
    cre: document.getElementById("bar-cre"),
    end: document.getElementById("bar-end"),
    foc: document.getElementById("bar-foc"),
    wis: document.getElementById("bar-wis")
  },
  dailyTaskList: document.getElementById("dailyTaskList"),
  taskInput: document.getElementById("taskInput"),
  taskDescriptionInput: document.getElementById("taskDescriptionInput"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  habitList: document.getElementById("habitList"),
  focusTimer: document.getElementById("focusTimer"),
  focusButtons: document.querySelectorAll(".focus-controls button"),
  cancelFocusBtn: document.getElementById("cancelFocusBtn"),
  focusSessionList: document.getElementById("focusSessionList"),
  noteInput: document.getElementById("noteInput"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  notesList: document.getElementById("notesList"),
  amountInput: document.getElementById("amountInput"),
  typeInput: document.getElementById("typeInput"),
  addTransactionBtn: document.getElementById("addTransactionBtn"),
  transactionList: document.getElementById("transactionList"),
  balance: document.getElementById("balance"),
  activityLogList: document.getElementById("activityLogList")
};

const paths = getPaths();
let focusInterval = null;
let activeSessionId = null;
let activeSessionStart = null;
let activeSessionDuration = null;

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

function updateTimerDisplay(seconds) {
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  elements.focusTimer.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function renderStatBar(statKey, value) {
  const percent = Math.min(100, Math.round((Math.max(0, value) / 100) * 100));
  const bar = elements.statBars[statKey];
  if (!bar) return;
  bar.style.width = `${percent}%`;
}

function renderStats(stats) {
  if (!stats) return;
  ["atk", "int", "disc", "cre", "end", "foc", "wis"].forEach((key) => {
    const value = stats[key] ?? 0;
    elements[key].textContent = value;
    renderStatBar(key, value);
  });
  elements.level.textContent = stats.level ?? 1;
  elements.exp.textContent = stats.exp ?? 0;
}

async function completeDailyTask(taskId) {
  const task = await dailyTasksApi.getById(taskId);
  if (!task) return;

  const today = new Date().toDateString();
  if (task.lastCompleted === today) {
    alert("Already completed today");
    return;
  }

  await applyReward(task.reward || {}, { source: task.title || "Daily Task" });
  await dailyTasksApi.patchById(taskId, { lastCompleted: today });
}

function loadDailyTasks() {
  dailyTasksApi.subscribe((tasks) => {
    elements.dailyTaskList.innerHTML = "";
    if (!tasks) return;

    Object.entries(tasks).forEach(([id, task]) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      title.textContent = task.title;
      li.appendChild(title);

      li.appendChild(buildActions([
        { label: "Complete", onClick: () => completeDailyTask(id) }
      ]));

      elements.dailyTaskList.appendChild(li);
    });
  });
}

async function addTask() {
  const title = elements.taskInput.value.trim();
  const description = elements.taskDescriptionInput.value.trim();
  if (!title) return;

  await tasksApi.addTask({
    title,
    description,
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now()
  });

  elements.taskInput.value = "";
  elements.taskDescriptionInput.value = "";
}

async function editTask(taskId, task) {
  const title = prompt("Edit task title:", task.title || "");
  if (title === null) return;
  const description = prompt("Edit task description:", task.description || "");
  if (description === null) return;

  await tasksApi.updateById(taskId, {
    title: title.trim() || task.title,
    description: description.trim(),
    updatedAt: Date.now()
  });
}

async function deleteTask(taskId) {
  await tasksApi.deleteById(taskId);
}

async function completeTask(taskId, task) {
  if (task.completed) return;
  await applyReward(task.reward || { exp: 20 }, { source: task.title || "Task" });
  await tasksApi.updateById(taskId, { completed: true, completedAt: Date.now() });
}

function loadTasks() {
  tasksApi.subscribe((tasks) => {
    elements.taskList.innerHTML = "";
    if (!tasks) return;

    Object.entries(tasks)
      .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(([id, task]) => {
        const li = document.createElement("li");

        const text = document.createElement("div");
        text.className = "item-main";
        text.textContent = `${task.title}${task.description ? ` — ${task.description}` : ""}`;
        if (task.completed) {
          text.classList.add("is-completed");
        }
        li.appendChild(text);

        li.appendChild(buildActions([
          {
            label: "Complete",
            className: task.completed ? "btn-muted" : "",
            onClick: () => completeTask(id, task)
          },
          { label: "Edit", onClick: () => editTask(id, task) },
          { label: "Delete", className: "btn-danger", onClick: () => deleteTask(id) }
        ]));

        elements.taskList.appendChild(li);
      });
  });
}

async function completeHabit(habitId, habit) {
  const today = new Date().toDateString();
  if (habit.lastCompleted === today) {
    alert("Habit already completed today");
    return;
  }
  await applyReward(habit.reward || {}, { source: habit.title || "Habit" });
  await habitsApi.patchById(habitId, {
    lastCompleted: today,
    streak: (habit.streak || 0) + 1
  });
}

function loadHabits() {
  habitsApi.subscribe((habits) => {
    elements.habitList.innerHTML = "";
    if (!habits) return;

    Object.entries(habits).forEach(([id, habit]) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      title.textContent = `${habit.title} (streak: ${habit.streak || 0})`;
      li.appendChild(title);
      li.appendChild(buildActions([
        { label: "Complete", onClick: () => completeHabit(id, habit) }
      ]));
      elements.habitList.appendChild(li);
    });
  });
}

async function beginFocusSession(minutes) {
  if (activeSessionId) {
    alert("A focus session is already active.");
    return;
  }

  const sessionRef = await focusApi.addSession({
    startTime: Date.now(),
    duration: minutes,
    status: "active",
    endedAt: null,
    createdAt: Date.now()
  });

  activeSessionId = sessionRef.key;
  activeSessionStart = Date.now();
  activeSessionDuration = minutes;

  await focusApi.setSessionState({
    focusSessionActive: true,
    sessionId: activeSessionId,
    startTime: activeSessionStart,
    duration: activeSessionDuration
  });

  startFocusTimer(activeSessionStart, activeSessionDuration);
}

function startFocusTimer(startTime, durationMinutes) {
  if (focusInterval) clearInterval(focusInterval);

  const totalSeconds = durationMinutes * 60;
  const tick = async () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remaining = totalSeconds - elapsedSeconds;
    updateTimerDisplay(remaining);

    if (remaining <= 0) {
      clearInterval(focusInterval);
      focusInterval = null;

      if (activeSessionId) {
        await focusApi.updateSessionById(activeSessionId, {
          status: "completed",
          endedAt: Date.now()
        });
      }

      await focusApi.clearSessionState();
      activeSessionId = null;
      await applyReward({ foc: 5, exp: 10 }, { source: "Focus Session" });
    }
  };

  tick();
  focusInterval = setInterval(tick, 1000);
}

async function cancelActiveFocusSession() {
  if (!activeSessionId) return;

  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }

  await focusApi.updateSessionById(activeSessionId, {
    status: "cancelled",
    endedAt: Date.now()
  });
  await focusApi.clearSessionState();

  activeSessionId = null;
  activeSessionStart = null;
  activeSessionDuration = null;
  updateTimerDisplay(0);
}

async function deleteFocusSession(sessionId) {
  if (sessionId === activeSessionId) {
    await cancelActiveFocusSession();
  }
  await focusApi.deleteSessionById(sessionId);
}

async function restoreFocusSessionIfAny() {
  const state = await focusApi.getSessionState();
  if (!state || !state.focusSessionActive) return;

  activeSessionId = state.sessionId;
  activeSessionStart = state.startTime;
  activeSessionDuration = state.duration;
  startFocusTimer(activeSessionStart, activeSessionDuration);
}

function loadFocusSessions() {
  focusApi.subscribeSessions((sessions) => {
    elements.focusSessionList.innerHTML = "";
    if (!sessions) return;

    Object.entries(sessions)
      .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(([id, session]) => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${session.duration}m — ${session.status || "unknown"}`;
        li.appendChild(text);

        const actions = [];
        if (id === activeSessionId && session.status === "active") {
          actions.push({ label: "Cancel", onClick: cancelActiveFocusSession });
        }
        actions.push({ label: "Delete", className: "btn-danger", onClick: () => deleteFocusSession(id) });
        li.appendChild(buildActions(actions));

        elements.focusSessionList.appendChild(li);
      });
  });
}

async function saveNote() {
  const content = elements.noteInput.value.trim();
  if (!content) return;

  await notesApi.addNote({ content, date: Date.now() });
  elements.noteInput.value = "";
}

async function editNote(noteId, note) {
  const nextContent = prompt("Edit note:", note.content || "");
  if (nextContent === null) return;

  await notesApi.updateById(noteId, {
    content: nextContent.trim() || note.content,
    date: Date.now()
  });
}

async function deleteNote(noteId) {
  await notesApi.deleteById(noteId);
}

function loadNotes() {
  notesApi.subscribe((notes) => {
    elements.notesList.innerHTML = "";
    if (!notes) return;

    Object.entries(notes)
      .sort(([, a], [, b]) => (b.date || 0) - (a.date || 0))
      .forEach(([id, note]) => {
        const li = document.createElement("li");
        const content = document.createElement("span");
        content.textContent = note.content;
        li.appendChild(content);

        li.appendChild(buildActions([
          { label: "Edit", onClick: () => editNote(id, note) },
          { label: "Delete", className: "btn-danger", onClick: () => deleteNote(id) }
        ]));

        elements.notesList.appendChild(li);
      });
  });
}

async function addTransaction() {
  const amount = Number(elements.amountInput.value);
  if (!amount) return;

  await financeApi.addTransaction({
    amount,
    type: elements.typeInput.value,
    date: Date.now()
  });

  elements.amountInput.value = "";
}

async function editTransaction(txId, tx) {
  const nextAmount = prompt("Edit amount:", String(tx.amount));
  if (nextAmount === null) return;

  const parsed = Number(nextAmount);
  if (!parsed) return;

  await financeApi.updateTransactionById(txId, {
    amount: parsed,
    date: Date.now()
  });
}

async function deleteTransaction(txId) {
  await financeApi.deleteTransactionById(txId);
}

function loadFinance() {
  financeApi.subscribeTransactions(async (transactions) => {
    elements.transactionList.innerHTML = "";

    let balance = 0;
    const rows = transactions ? Object.entries(transactions) : [];

    rows
      .sort(([, a], [, b]) => (b.date || 0) - (a.date || 0))
      .forEach(([id, tx]) => {
        const sign = tx.type === "expense" ? -1 : 1;
        balance += sign * Number(tx.amount || 0);

        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${tx.type}: ${tx.amount}`;
        li.appendChild(text);

        li.appendChild(buildActions([
          { label: "Edit", onClick: () => editTransaction(id, tx) },
          { label: "Delete", className: "btn-danger", onClick: () => deleteTransaction(id) }
        ]));

        elements.transactionList.appendChild(li);
      });

    elements.balance.textContent = balance;
    await financeApi.patchFinance({ balance });
  });
}

function loadActivityLog() {
  activityApi.subscribe((entries) => {
    elements.activityLogList.innerHTML = "";
    if (!entries) return;

    Object.values(entries)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 20)
      .forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry.message || `+${entry.value} ${String(entry.stat || "").toUpperCase()}`;
        elements.activityLogList.appendChild(li);
      });
  });
}

function bindEvents() {
  elements.addTaskBtn.addEventListener("click", addTask);
  elements.saveNoteBtn.addEventListener("click", saveNote);
  elements.addTransactionBtn.addEventListener("click", addTransaction);
  elements.cancelFocusBtn.addEventListener("click", cancelActiveFocusSession);

  elements.focusButtons.forEach((button) => {
    button.addEventListener("click", () => beginFocusSession(Number(button.dataset.duration)));
  });
}

function init() {
  bindEvents();
  subscribe(paths.stats, renderStats);
  loadDailyTasks();
  loadTasks();
  loadHabits();
  loadNotes();
  loadFinance();
  loadFocusSessions();
  loadActivityLog();
  restoreFocusSessionIfAny();
}

init();
