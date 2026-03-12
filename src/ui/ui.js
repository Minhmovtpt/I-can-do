import { activityApi } from "../core/firebase.js";
import { initRewardEngine } from "../core/rewardEngine.js";
import { initStats } from "../modules/stats.js";
import { initTasks } from "../modules/tasks.js";
import { initHabits } from "../modules/habits.js";
import { initNotes } from "../modules/notes.js";
import { initFinance } from "../modules/finance.js";
import { initFocus } from "../modules/focus.js";
import { initCalendar } from "../modules/calendar.js";

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
    wis: document.getElementById("bar-wis"),
  },
  quickStats: {
    atk: document.getElementById("quick-atk"),
    int: document.getElementById("quick-int"),
    disc: document.getElementById("quick-disc"),
    cre: document.getElementById("quick-cre"),
    end: document.getElementById("quick-end"),
    foc: document.getElementById("quick-foc"),
    wis: document.getElementById("quick-wis"),
    levelExp: document.getElementById("quick-level-exp"),
  },
  todaySummaryList: document.getElementById("todaySummaryList"),
  todayEventsList: document.getElementById("todayEventsList"),
  sidebarNav: document.getElementById("sidebarNav"),
  navButtons: document.querySelectorAll(".nav-btn"),
  mainViews: document.querySelectorAll(".main-view"),
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
  activityLogList: document.getElementById("activityLogList"),
  calendarTitleInput: document.getElementById("calendarTitleInput"),
  calendarStartInput: document.getElementById("calendarStartInput"),
  calendarEndInput: document.getElementById("calendarEndInput"),
  calendarNotesInput: document.getElementById("calendarNotesInput"),
  calendarLinkTypeInput: document.getElementById("calendarLinkTypeInput"),
  calendarLinkIdInput: document.getElementById("calendarLinkIdInput"),
  addCalendarEventBtn: document.getElementById("addCalendarEventBtn"),
  calendarPrevMonthBtn: document.getElementById("calendarPrevMonthBtn"),
  calendarNextMonthBtn: document.getElementById("calendarNextMonthBtn"),
  calendarTodayBtn: document.getElementById("calendarTodayBtn"),
  calendarMonthLabel: document.getElementById("calendarMonthLabel"),
  calendarWeekdays: document.getElementById("calendarWeekdays"),
  calendarGrid: document.getElementById("calendarGrid"),
};

function notifyError(error, fallback = "Operation failed") {
  console.error(error);
  const message = error?.message || fallback;
  alert(message);
}

function switchMainView(viewName) {
  elements.mainViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });

  elements.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
}

function initNavigation() {
  elements.sidebarNav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;
    switchMainView(button.dataset.view);
  });
}

function mirrorQuickStats() {
  const statKeys = ["atk", "int", "disc", "cre", "end", "foc", "wis"];
  statKeys.forEach((key) => {
    elements.quickStats[key].textContent = elements[key].textContent;
  });
  elements.quickStats.levelExp.textContent = `${elements.level.textContent} / ${elements.exp.textContent}`;
}

function renderTodaySummary() {
  const rows = [
    `Daily tasks: ${elements.dailyTaskList.children.length}`,
    `Open tasks: ${elements.taskList.querySelectorAll(".item-main:not(.is-completed)").length}`,
    `Completed tasks: ${elements.taskList.querySelectorAll(".item-main.is-completed").length}`,
    `Habits tracked: ${elements.habitList.children.length}`,
    `Focus sessions: ${elements.focusSessionList.children.length}`,
  ];

  elements.todaySummaryList.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = row;
    elements.todaySummaryList.appendChild(li);
  });
}

function renderTodayEvents() {
  const day = new Date().getDate();
  const calendarDayLabel = Array.from(elements.calendarGrid.querySelectorAll(".calendar-day-label")).find(
    (label) => Number(label.textContent) === day,
  );

  elements.todayEventsList.innerHTML = "";

  if (!calendarDayLabel) {
    const li = document.createElement("li");
    li.textContent = "No events scheduled for today.";
    elements.todayEventsList.appendChild(li);
    return;
  }

  const dayCell = calendarDayLabel.closest(".calendar-day");
  const eventButtons = dayCell ? dayCell.querySelectorAll(".calendar-event-btn") : [];

  if (!eventButtons.length) {
    const li = document.createElement("li");
    li.textContent = "No events scheduled for today.";
    elements.todayEventsList.appendChild(li);
    return;
  }

  eventButtons.forEach((button) => {
    const li = document.createElement("li");
    li.textContent = button.textContent;
    elements.todayEventsList.appendChild(li);
  });
}

function observeDashboardData() {
  const observer = new MutationObserver(() => {
    mirrorQuickStats();
    renderTodaySummary();
    renderTodayEvents();
  });

  [
    elements.dailyTaskList,
    elements.taskList,
    elements.habitList,
    elements.focusSessionList,
    elements.calendarGrid,
    elements.level,
    elements.exp,
    elements.atk,
    elements.int,
    elements.disc,
    elements.cre,
    elements.end,
    elements.foc,
    elements.wis,
  ].forEach((target) => {
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  });

  mirrorQuickStats();
  renderTodaySummary();
  renderTodayEvents();
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
        li.textContent =
          entry.message || `+${entry.value} ${String(entry.stat || "").toUpperCase()}`;
        elements.activityLogList.appendChild(li);
      });
  });
}

function init() {
  initNavigation();
  initRewardEngine({ notifyError });
  initStats(elements);
  initTasks(elements, notifyError);
  initHabits(elements, notifyError);
  initNotes(elements, notifyError);
  initFinance(elements, notifyError);
  initFocus(elements, notifyError);
  initCalendar(elements, notifyError);
  initActivityLog();
  observeDashboardData();
}

init();
