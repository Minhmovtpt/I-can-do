import { activityApi } from "./firebase.js";
import { initStats } from "./stats.js";
import { initTasks } from "./tasks.js";
import { initHabits } from "./habits.js";
import { initNotes } from "./notes.js";
import { initFinance } from "./finance.js";
import { initFocus } from "./focus.js";

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
  focusButtons: document.querySelectorAll(".focus-controls button[data-duration]"),
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

function notifyError(error, fallback = "Operation failed") {
  console.error(error);
  const message = error?.message || fallback;
  alert(message);
}

function initActivityLog() {
  return activityApi.subscribe((entries) => {
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

function init() {
  initStats(elements);
  initTasks(elements, notifyError);
  initHabits(elements, notifyError);
  initNotes(elements, notifyError);
  initFinance(elements, notifyError);
  initFocus(elements, notifyError);
  initActivityLog();
}

init();
