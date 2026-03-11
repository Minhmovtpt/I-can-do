import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  update,
  push,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPHwqlZhzpE_fR3d5LuOpmTJQoxmMC-nM",
  authDomain: "database-tracking-29f0a.firebaseapp.com",
  databaseURL: "https://database-tracking-29f0a-default-rtdb.firebaseio.com",
  projectId: "database-tracking-29f0a",
  storageBucket: "database-tracking-29f0a.firebasestorage.app",
  messagingSenderId: "360569185652",
  appId: "1:360569185652:web:e4578b58055a72ee68f821"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  balance: document.getElementById("balance")
};

const refs = {
  stats: ref(db, "stats"),
  dailyTasks: ref(db, "dailyTasks"),
  tasks: ref(db, "tasks"),
  habits: ref(db, "habits"),
  focusSessions: ref(db, "focusSessions"),
  notes: ref(db, "notes"),
  finance: ref(db, "finance"),
  financeTransactions: ref(db, "finance/transactions")
};

let focusInterval = null;
let activeFocusSessionRef = null;

function checkLevelUp(stats) {
  while (stats.exp >= stats.level * 100) {
    stats.exp -= stats.level * 100;
    stats.level += 1;
  }
}

async function applyReward(reward = {}) {
  const snapshot = await get(refs.stats);
  const stats = snapshot.val() || {
    atk: 0,
    int: 0,
    disc: 0,
    cre: 0,
    end: 0,
    foc: 0,
    wis: 0,
    exp: 0,
    level: 1
  };

  const updatedStats = {
    atk: stats.atk + (reward.atk || 0),
    int: stats.int + (reward.int || 0),
    disc: stats.disc + (reward.disc || 0),
    cre: stats.cre + (reward.cre || 0),
    end: stats.end + (reward.end || 0),
    foc: stats.foc + (reward.foc || 0),
    wis: stats.wis + (reward.wis || 0),
    exp: stats.exp + (reward.exp || 0),
    level: stats.level
  };

  checkLevelUp(updatedStats);
  await set(refs.stats, updatedStats);
}

function renderStats(stats) {
  if (!stats) return;
  elements.atk.textContent = stats.atk ?? 0;
  elements.int.textContent = stats.int ?? 0;
  elements.disc.textContent = stats.disc ?? 0;
  elements.cre.textContent = stats.cre ?? 0;
  elements.end.textContent = stats.end ?? 0;
  elements.foc.textContent = stats.foc ?? 0;
  elements.wis.textContent = stats.wis ?? 0;
  elements.level.textContent = stats.level ?? 1;
  elements.exp.textContent = stats.exp ?? 0;
}

function loadStats() {
  onValue(refs.stats, (snapshot) => renderStats(snapshot.val()));
}

async function completeDailyTask(taskId) {
  const taskRef = ref(db, `dailyTasks/${taskId}`);
  const snapshot = await get(taskRef);
  const task = snapshot.val();
  if (!task) return;

  const today = new Date().toDateString();
  if (task.lastCompleted === today) {
    alert("Already completed today");
    return;
  }

  await applyReward(task.reward || {});
  await update(taskRef, { lastCompleted: today });
}

function loadDailyTasks() {
  onValue(refs.dailyTasks, (snapshot) => {
    const tasks = snapshot.val();
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

function loadTasks() {
  onValue(refs.tasks, (snapshot) => {
    const tasks = snapshot.val();
    elements.taskList.innerHTML = "";
    if (!tasks) return;

    Object.values(tasks).forEach((task) => {
      const li = document.createElement("li");
      li.textContent = task.title;
      elements.taskList.appendChild(li);
    });
  });
}

async function addTask() {
  const title = elements.taskInput.value.trim();
  if (!title) return;

  await push(refs.tasks, {
    title,
    description: "",
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now()
  });

  elements.taskInput.value = "";
}

function loadHabits() {
  onValue(refs.habits, (snapshot) => {
    const habits = snapshot.val();
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

async function completeHabit(habitId, habit) {
  const today = new Date().toDateString();
  if (habit.lastCompleted === today) {
    alert("Habit already completed today");
    return;
  }

  const habitRef = ref(db, `habits/${habitId}`);
  await applyReward(habit.reward || {});
  await update(habitRef, {
    lastCompleted: today,
    streak: (habit.streak || 0) + 1
  });
}

function startFocus(minutes) {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }

  let seconds = minutes * 60;
  const reward = { foc: 5, exp: 10 };
  const now = Date.now();
  activeFocusSessionRef = push(refs.focusSessions);

  set(activeFocusSessionRef, {
    durationMinutes: minutes,
    startedAt: now,
    endedAt: null,
    completed: false,
    reward
  });

  updateTimerDisplay(seconds);

  focusInterval = setInterval(async () => {
    seconds -= 1;
    updateTimerDisplay(seconds);

    if (seconds <= 0) {
      clearInterval(focusInterval);
      focusInterval = null;
      await applyReward(reward);

      if (activeFocusSessionRef) {
        await update(activeFocusSessionRef, {
          endedAt: Date.now(),
          completed: true
        });
      }
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  elements.focusTimer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function loadNotes() {
  onValue(refs.notes, (snapshot) => {
    const notes = snapshot.val();
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

async function saveNote() {
  const content = elements.noteInput.value.trim();
  if (!content) return;

  await push(refs.notes, {
    content,
    date: Date.now()
  });

  elements.noteInput.value = "";
}

function loadFinance() {
  onValue(refs.financeTransactions, (snapshot) => {
    const transactions = snapshot.val();
    elements.transactionList.innerHTML = "";

    let balance = 0;
    const items = transactions ? Object.values(transactions) : [];

    items
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .forEach((transaction) => {
        const sign = transaction.type === "expense" ? -1 : 1;
        balance += sign * Number(transaction.amount || 0);

        const li = document.createElement("li");
        li.textContent = `${transaction.type}: ${transaction.amount}`;
        elements.transactionList.appendChild(li);
      });

    elements.balance.textContent = balance;
    update(refs.finance, { balance });
  });
}

async function addTransaction() {
  const amount = Number(elements.amountInput.value);
  if (!amount) return;

  await push(refs.financeTransactions, {
    amount,
    type: elements.typeInput.value,
    date: Date.now()
  });

  elements.amountInput.value = "";
}

function bindEvents() {
  elements.addTaskBtn.addEventListener("click", addTask);
  elements.saveNoteBtn.addEventListener("click", saveNote);
  elements.addTransactionBtn.addEventListener("click", addTransaction);

  elements.focusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      startFocus(Number(button.dataset.duration));
    });
  });
}

function init() {
  bindEvents();
  loadStats();
  loadDailyTasks();
  loadTasks();
  loadHabits();
  loadNotes();
  loadFinance();
}

init();
