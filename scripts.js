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
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  habitList: document.getElementById("habitList"),
  focusTimer: document.getElementById("focusTimer"),
  focusButtons: document.querySelectorAll(".focus-controls button"),
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

function updateTimerDisplay(seconds) {
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  elements.focusTimer.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function renderStatBar(statKey, value) {
  const cap = 100;
  const percent = Math.min(100, Math.round((Math.max(0, value) / cap) * 100));
  const bar = elements.statBars[statKey];
  if (!bar) return;

  bar.style.width = `${percent}%`;
  bar.setAttribute("aria-valuenow", String(value));
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
      const button = document.createElement("button");
      button.textContent = task.title;
      button.addEventListener("click", () => completeDailyTask(id));
      li.appendChild(button);
      elements.dailyTaskList.appendChild(li);
    });
  });
}

async function addTask() {
  const title = elements.taskInput.value.trim();
  if (!title) return;

  await tasksApi.addTask({
    title,
    description: "",
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now()
  });

  elements.taskInput.value = "";
}

function loadTasks() {
  tasksApi.subscribe((tasks) => {
    elements.taskList.innerHTML = "";
    if (!tasks) return;

    Object.values(tasks)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach((task) => {
        const li = document.createElement("li");
        li.textContent = task.title;
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
      const button = document.createElement("button");
      button.textContent = `${habit.title} (streak: ${habit.streak || 0})`;
      button.addEventListener("click", () => completeHabit(id, habit));
      li.appendChild(button);
      elements.habitList.appendChild(li);
    });
  });
}

async function beginFocusSession(minutes) {
  const state = {
    focusSessionActive: true,
    startTime: Date.now(),
    duration: minutes
  };

  await focusApi.setSessionState(state);
  await focusApi.addSession({ ...state, completed: false, endedAt: null });
  startFocusTimer(state.startTime, state.duration);
}

function startFocusTimer(startTime, durationMinutes) {
  if (focusInterval) {
    clearInterval(focusInterval);
  }

  const totalSeconds = durationMinutes * 60;

  const tick = async () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remaining = totalSeconds - elapsedSeconds;
    updateTimerDisplay(remaining);

    if (remaining <= 0) {
      clearInterval(focusInterval);
      focusInterval = null;
      await focusApi.clearSessionState();
      await applyReward({ foc: 5, exp: 10 }, { source: "Focus Session" });
    }
  };

  tick();
  focusInterval = setInterval(tick, 1000);
}

async function restoreFocusSessionIfAny() {
  const state = await focusApi.getSessionState();
  if (!state || !state.focusSessionActive) return;
  startFocusTimer(state.startTime, state.duration);
}

async function saveNote() {
  const content = elements.noteInput.value.trim();
  if (!content) return;

  await notesApi.addNote({
    content,
    date: Date.now()
  });

  elements.noteInput.value = "";
}

function loadNotes() {
  notesApi.subscribe((notes) => {
    elements.notesList.innerHTML = "";
    if (!notes) return;

    Object.values(notes)
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .forEach((note) => {
        const li = document.createElement("li");
        li.textContent = note.content;
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

function loadFinance() {
  financeApi.subscribeTransactions(async (transactions) => {
    elements.transactionList.innerHTML = "";

    let balance = 0;
    const rows = transactions ? Object.values(transactions) : [];

    rows
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .forEach((tx) => {
        const sign = tx.type === "expense" ? -1 : 1;
        balance += sign * Number(tx.amount || 0);

        const li = document.createElement("li");
        li.textContent = `${tx.type}: ${tx.amount}`;
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

  elements.focusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginFocusSession(Number(button.dataset.duration));
    });
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
  loadActivityLog();
  restoreFocusSessionIfAny();
}

init();
