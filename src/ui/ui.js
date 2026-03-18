import { activityApi, tasksApi, dailyTasksApi, habitsApi, calendarApi } from "../core/firebase.js";
import { initRewardEngine } from "../core/rewardEngine.js";
import { initStats } from "../modules/stats.js";
import { initTasks } from "../modules/tasks.js";
import { initHabits } from "../modules/habits.js";
import { initFinance } from "../modules/finance.js";
import { initCalendar } from "../modules/calendar.js";
import { initFocus } from "../modules/focus.js";
import { initNotes } from "../modules/notes.js";
import { initSettings } from "../modules/settings.js";
import { initWebShortcuts } from "../modules/webShortcuts.js";
import { initFinanceGuard } from "../modules/financeGuard.js";
import { createNote } from "../services/noteService.js";
import { buildScheduledItems, toDayKey } from "../core/calendarLogic.js";
import { isWeeklyHabitDueOnDate } from "../core/habitLogic.js";

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
  focusDashboardTimer: document.getElementById("focusDashboardTimer"),
  focusDashboardStartBtn: document.getElementById("focusDashboardStartBtn"),
  focusDashboardStopBtn: document.getElementById("focusDashboardStopBtn"),
  focusSessionToday: document.getElementById("focusSessionToday"),
  focusTotalTimeToday: document.getElementById("focusTotalTimeToday"),
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
  webShortcutsContainer: document.getElementById("webShortcutsContainer"),
  financeGuardModal: document.getElementById("financeGuardModal"),
  financePasswordInput: document.getElementById("financePasswordInput"),
  financeUnlockBtn: document.getElementById("financeUnlockBtn"),
  financeCancelBtn: document.getElementById("financeCancelBtn"),
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

function initNavigation(financeGuard) {
  elements.sidebarNav.addEventListener("click", async (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;

    const targetView = button.dataset.view;
    const currentView = document.querySelector(".main-view.is-active")?.dataset.view;

    if (currentView === "finance" && targetView !== "finance") {
      financeGuard.lockFinance();
    }

    if (targetView === "finance") {
      const allowed = await financeGuard.canAccessFinance();
      if (!allowed) {
        switchMainView(currentView || "dashboard");
        return;
      }
    }

    switchMainView(targetView);
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

function renderTodaySummary(data) {
  const tasks = Object.values(data.tasks || {}).filter(
    (task) => task && task.type !== "daily" && task.type !== "habit",
  );
  const completedTasks = tasks.filter((task) => task.completed || task.status === "done").length;
  const dueTodayHabits = Object.values(data.habits || {}).filter((habit) =>
    isWeeklyHabitDueOnDate(habit, new Date()),
  ).length;
  const rows = [
    `Daily tasks: ${Object.keys(data.dailyTasks || {}).length}`,
    `Open tasks: ${Math.max(0, tasks.length - completedTasks)}`,
    `Completed tasks: ${completedTasks}`,
    `Habits tracked: ${dueTodayHabits}`,
  ];

  elements.todaySummaryList.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = row;
    elements.todaySummaryList.appendChild(li);
  });
}

function renderTodayEvents(data) {
  const today = new Date();
  const todayEvents =
    buildScheduledItems([today], data.tasks, data.dailyTasks, data.habits, data.calendarEvents).get(
      toDayKey(today),
    ) || [];

  elements.todayEventsList.innerHTML = "";

  if (!todayEvents.length) {
    const li = document.createElement("li");
    li.textContent = "No events scheduled for today.";
    elements.todayEventsList.appendChild(li);
    return;
  }

  todayEvents
    .sort((a, b) => (a.startAt || 0) - (b.startAt || 0))
    .forEach((event) => {
      const li = document.createElement("li");
      li.textContent = `${new Date(event.startAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} ${event.title} [${event.kind}]`;
      elements.todayEventsList.appendChild(li);
    });
}

function observeDashboardData() {
  const dashboardData = {
    tasks: {},
    dailyTasks: {},
    habits: {},
    calendarEvents: {},
  };

  const render = () => {
    renderTodaySummary(dashboardData);
    renderTodayEvents(dashboardData);
  };

  const unsubscribers = [
    tasksApi.subscribe((tasks) => {
      dashboardData.tasks = tasks || {};
      render();
    }),
    dailyTasksApi.subscribe((dailyTasks) => {
      dashboardData.dailyTasks = dailyTasks || {};
      render();
    }),
    habitsApi.subscribe((habits) => {
      dashboardData.habits = habits || {};
      render();
    }),
    calendarApi.subscribeEvents((events) => {
      dashboardData.calendarEvents = events || {};
      render();
    }),
  ];

  render();
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
  const financeGuard = initFinanceGuard(elements);
  initNavigation(financeGuard);
  initRewardEngine({ notifyError });
  initStats(elements);
  initTasks(elements, notifyError);
  initHabits(elements, notifyError);
  initSettings(elements, notifyError);
  initNotes(elements, notifyError);
  initFinance(elements, notifyError);
  initFocus(elements, notifyError);
  initCalendar(elements, notifyError);
  initWebShortcuts(elements);
  initQuickNote();
  initDateTime();
  initActivityLog();
  observeDashboardData();
}

init();
