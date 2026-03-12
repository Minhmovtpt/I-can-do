import { activityApi } from "../core/firebase.js";
import { initRewardEngine } from "../core/rewardEngine.js";
import { initStats } from "../modules/stats.js";
import { initTasks } from "../modules/tasks.js";
import { initHabits } from "../modules/habits.js";
import { initFinance } from "../modules/finance.js";
import { initCalendar } from "../modules/calendar.js";
import { initFocus } from "../modules/focus.js";
import { initNotes } from "../modules/notes.js";
import { initSettings } from "../modules/settings.js";
import { createNote } from "../services/noteService.js";

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
  currentDayOfWeek: document.getElementById("currentDayOfWeek"),
  currentDate: document.getElementById("currentDate"),
  currentTime: document.getElementById("currentTime"),
  quickNoteInput: document.getElementById("quickNoteInput"),
  quickNoteClearBtn: document.getElementById("quickNoteClearBtn"),
  quickNotePushBtn: document.getElementById("quickNotePushBtn"),
  todaySummaryList: document.getElementById("todaySummaryList"),
  todayEventsList: document.getElementById("todayEventsList"),
  sidebarNav: document.getElementById("sidebarNav"),
  navButtons: document.querySelectorAll(".nav-btn"),
  mainViews: document.querySelectorAll(".main-view"),
  calendarTabs: document.getElementById("calendarTabs"),
  calendarModes: document.querySelectorAll(".calendar-mode"),
  dailyTaskList: document.getElementById("dailyTaskList"),
  dailyProgressText: document.getElementById("dailyProgressText"),
  dailyTrackingTabs: document.getElementById("dailyTrackingTabs"),
  habitTrackingTabs: document.getElementById("habitTrackingTabs"),
  habitList: document.getElementById("habitList"),
  settingsAddDailyTaskBtn: document.getElementById("settingsAddDailyTaskBtn"),
  settingsDailyTaskCreationArea: document.getElementById("settingsDailyTaskCreationArea"),
  settingsDailyTaskList: document.getElementById("settingsDailyTaskList"),
  settingsAddHabitBtn: document.getElementById("settingsAddHabitBtn"),
  settingsHabitCreationArea: document.getElementById("settingsHabitCreationArea"),
  settingsHabitList: document.getElementById("settingsHabitList"),
  resetTasksBtn: document.getElementById("resetTasksBtn"),
  resetStatsBtn: document.getElementById("resetStatsBtn"),
  resetDatabaseBtn: document.getElementById("resetDatabaseBtn"),
  taskInput: document.getElementById("taskInput"),
  taskDescriptionInput: document.getElementById("taskDescriptionInput"),
  taskConditionInput: document.getElementById("taskConditionInput"),
  taskTypeInput: document.getElementById("taskTypeInput"),
  taskPriorityInput: document.getElementById("taskPriorityInput"),
  taskScheduleInput: document.getElementById("taskScheduleInput"),
  taskCreationPanel: document.getElementById("taskCreationPanel"),
  toggleTaskCreationBtn: document.getElementById("toggleTaskCreationBtn"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  kanbanBacklog: document.getElementById("kanban-backlog"),
  kanbanTodo: document.getElementById("kanban-todo"),
  kanbanInProgress: document.getElementById("kanban-in-progress"),
  kanbanDone: document.getElementById("kanban-done"),
  focusTimer: document.getElementById("focusTimer"),
  focusButtons: document.querySelectorAll(".focus-controls button[data-duration]"),
  cancelFocusBtn: document.getElementById("cancelFocusBtn"),
  focusSessionList: document.getElementById("focusSessionList"),
  noteInput: document.getElementById("noteInput"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  notesList: document.getElementById("notesList"),
  amountInput: document.getElementById("amountInput"),
  typeInput: document.getElementById("typeInput"),
  isRecurringInput: document.getElementById("isRecurringInput"),
  addTransactionBtn: document.getElementById("addTransactionBtn"),
  transactionList: document.getElementById("transactionList"),
  balance: document.getElementById("balance"),
  incomeTotal: document.getElementById("incomeTotal"),
  expenseTotal: document.getElementById("expenseTotal"),
  activityLogList: document.getElementById("activityLogList"),
  calendarPrevMonthBtn: document.getElementById("calendarPrevMonthBtn"),
  calendarNextMonthBtn: document.getElementById("calendarNextMonthBtn"),
  calendarTodayBtn: document.getElementById("calendarTodayBtn"),
  calendarViewMonthBtn: document.getElementById("calendarViewMonthBtn"),
  calendarViewWeekBtn: document.getElementById("calendarViewWeekBtn"),
  calendarViewDayBtn: document.getElementById("calendarViewDayBtn"),
  calendarMonthLabel: document.getElementById("calendarMonthLabel"),
  calendarWeekdays: document.getElementById("calendarWeekdays"),
  calendarGrid: document.getElementById("calendarGrid"),
};

function notifyError(error, fallback = "Operation failed") {
  console.error(error);
  alert(error?.message || fallback);
}

function switchMainView(viewName) {
  elements.mainViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
}

function switchCalendarMode(mode) {
  elements.calendarModes.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.calendarMode === mode);
  });

  elements.calendarTabs?.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.calendarMode === mode);
  });
}

function initNavigation() {
  elements.sidebarNav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;
    switchMainView(button.dataset.view);
  });

  elements.toggleTaskCreationBtn.addEventListener("click", () => {
    elements.taskCreationPanel.classList.toggle("is-open");
  });

  elements.calendarTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("button[data-calendar-mode]");
    if (!tab) return;
    switchCalendarMode(tab.dataset.calendarMode);
  });
}

function renderDateTime() {
  const now = new Date();
  elements.currentDayOfWeek.textContent = now.toLocaleDateString(undefined, { weekday: "long" });
  elements.currentDate.textContent = now.toISOString().slice(0, 10);
  elements.currentTime.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initDateTime() {
  renderDateTime();
  setInterval(renderDateTime, 60 * 1000);
}

function initQuickNote() {
  const storageKey = "quick-note-draft";
  const savedDraft = localStorage.getItem(storageKey);
  if (savedDraft) {
    elements.quickNoteInput.value = savedDraft;
  }

  elements.quickNoteInput.addEventListener("input", () => {
    localStorage.setItem(storageKey, elements.quickNoteInput.value);
  });

  elements.quickNoteClearBtn.addEventListener("click", () => {
    elements.quickNoteInput.value = "";
    localStorage.removeItem(storageKey);
  });

  elements.quickNotePushBtn.addEventListener("click", async () => {
    if (!elements.quickNoteInput.value.trim()) return;
    try {
      await createNote(elements.quickNoteInput.value);
      elements.quickNoteInput.value = "";
      localStorage.removeItem(storageKey);
    } catch (error) {
      notifyError(error, "Failed to push quick note");
    }
  });
}

function renderTodaySummary() {
  const taskCards = elements.taskList.querySelectorAll(".work-card");
  const completedTasks = Array.from(taskCards).filter((card) =>
    card.textContent.includes("Status: Done"),
  ).length;
  const rows = [
    `Daily tasks: ${elements.dailyTaskList.children.length}`,
    `Open tasks: ${taskCards.length - completedTasks}`,
    `Completed tasks: ${completedTasks}`,
    `Habits tracked: ${elements.habitList.children.length}`,
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
  const calendarDayLabel = Array.from(
    elements.calendarGrid.querySelectorAll(".calendar-day-label"),
  ).find((label) => Number(label.textContent) === day);

  elements.todayEventsList.innerHTML = "";
  const dayCell = calendarDayLabel?.closest(".calendar-day");
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

  renderTodaySummary();
  renderTodayEvents();
}

function initActivityLog() {
  return activityApi.subscribe((entries) => {
    elements.activityLogList.innerHTML = "";
    if (!entries) return;

    const sorted = Object.values(entries).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    sorted.slice(0, 5).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry.message || `+${entry.value} ${String(entry.stat || "").toUpperCase()}`;
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
  initSettings(elements, notifyError);
  initNotes(elements, notifyError);
  initFinance(elements, notifyError);
  initFocus(elements, notifyError);
  initCalendar(elements, notifyError);
  initQuickNote();
  initDateTime();
  initActivityLog();
  observeDashboardData();
}

init();
