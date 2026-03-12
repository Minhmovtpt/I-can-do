import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue,
  off,
  remove,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { PATHS } from "./schema.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPHwqlZhzpE_fR3d5LuOpmTJQoxmMC-nM",
  authDomain: "database-tracking-29f0a.firebaseapp.com",
  databaseURL: "https://database-tracking-29f0a-default-rtdb.firebaseio.com",
  projectId: "database-tracking-29f0a",
  storageBucket: "database-tracking-29f0a.firebasestorage.app",
  messagingSenderId: "360569185652",
  appId: "1:360569185652:web:e4578b58055a72ee68f821",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const activeListeners = new Map();

function pathRef(path) {
  return ref(db, path);
}

export function subscribe(path, callback) {
  const targetRef = pathRef(path);
  let listener = activeListeners.get(path);

  if (!listener) {
    listener = {
      callbacks: new Set(),
      handler: (snapshot) => {
        const value = snapshot.val();
        listener.callbacks.forEach((cb) => cb(value));
      },
    };

    onValue(targetRef, listener.handler);
    activeListeners.set(path, listener);
  }

  listener.callbacks.add(callback);

  return () => {
    const current = activeListeners.get(path);
    if (!current) return;
    current.callbacks.delete(callback);
    if (!current.callbacks.size) {
      off(targetRef, "value", current.handler);
      activeListeners.delete(path);
    }
  };
}

export function unsubscribeAll() {
  activeListeners.forEach((listener, path) => {
    off(pathRef(path), "value", listener.handler);
  });
  activeListeners.clear();
}

export async function read(path) {
  const snapshot = await get(pathRef(path));
  return snapshot.val();
}

export async function write(path, value) {
  await set(pathRef(path), value);
}

export async function patch(path, value) {
  await update(pathRef(path), value);
}

export async function create(path, value) {
  return push(pathRef(path), value);
}

export async function destroy(path) {
  await remove(pathRef(path));
}

export async function transaction(path, updater) {
  const txRef = pathRef(path);
  const txResult = await runTransaction(txRef, updater);
  return txResult.snapshot.val();
}

export function getPaths() {
  return PATHS;
}

export const statsApi = {
  get: () => read(PATHS.stats),
  set: (stats) => write(PATHS.stats, stats),
  transact: (updater) => transaction(PATHS.stats, updater),
  reset: () =>
    write(PATHS.stats, {
      atk: 0,
      int: 0,
      disc: 0,
      cre: 0,
      end: 0,
      foc: 0,
      wis: 0,
      level: 1,
      exp: 0,
    }),
};

export const tasksApi = {
  add: (task) => create(PATHS.tasks, task),
  subscribe: (callback) => subscribe(PATHS.tasks, callback),
  getById: (taskId) => read(`${PATHS.tasks}/${taskId}`),
  updateById: (taskId, value) => patch(`${PATHS.tasks}/${taskId}`, value),
  deleteById: (taskId) => destroy(`${PATHS.tasks}/${taskId}`),
};

export const notesApi = {
  add: (note) => create(PATHS.notes, note),
  subscribe: (callback) => subscribe(PATHS.notes, callback),
  getById: (noteId) => read(`${PATHS.notes}/${noteId}`),
  updateById: (noteId, value) => patch(`${PATHS.notes}/${noteId}`, value),
  deleteById: (noteId) => destroy(`${PATHS.notes}/${noteId}`),
};

export const financeApi = {
  addTransaction: (tx) => create(PATHS.financeTransactions, tx),
  subscribeTransactions: (callback) => subscribe(PATHS.financeTransactions, callback),
  patchFinance: (value) => patch(PATHS.finance, value),
  getTransactionById: (txId) => read(`${PATHS.financeTransactions}/${txId}`),
  updateTransactionById: (txId, value) => patch(`${PATHS.financeTransactions}/${txId}`, value),
  deleteTransactionById: (txId) => destroy(`${PATHS.financeTransactions}/${txId}`),
};

export const dailyTasksApi = {
  add: (task) => create(PATHS.dailyTasks, task),
  subscribe: (callback) => subscribe(PATHS.dailyTasks, callback),
  list: () => read(PATHS.dailyTasks),
  getById: (taskId) => read(`${PATHS.dailyTasks}/${taskId}`),
  patchById: (taskId, value) => patch(`${PATHS.dailyTasks}/${taskId}`, value),
  deleteById: (taskId) => destroy(`${PATHS.dailyTasks}/${taskId}`),
};

export const habitsApi = {
  add: (habit) => create(PATHS.habits, habit),
  subscribe: (callback) => subscribe(PATHS.habits, callback),
  list: () => read(PATHS.habits),
  getById: (habitId) => read(`${PATHS.habits}/${habitId}`),
  patchById: (habitId, value) => patch(`${PATHS.habits}/${habitId}`, value),
  deleteById: (habitId) => destroy(`${PATHS.habits}/${habitId}`),
};

export const focusApi = {
  getSessionState: () => read(PATHS.focusSessionState),
  setSessionState: (state) => write(PATHS.focusSessionState, state),
  clearSessionState: () => write(PATHS.focusSessionState, null),
  addSession: (session) => create(PATHS.focusSessions, session),
  subscribeSessions: (callback) => subscribe(PATHS.focusSessions, callback),
  getSessionById: (sessionId) => read(`${PATHS.focusSessions}/${sessionId}`),
  updateSessionById: (sessionId, value) => patch(`${PATHS.focusSessions}/${sessionId}`, value),
  deleteSessionById: (sessionId) => destroy(`${PATHS.focusSessions}/${sessionId}`),
};

export const activityApi = {
  addEntry: (entry) => create(PATHS.activityLog, entry),
  subscribe: (callback) => subscribe(PATHS.activityLog, callback),
};

export const calendarApi = {
  addEvent: (event) => create(PATHS.calendarEvents, event),
  subscribeEvents: (callback) => subscribe(PATHS.calendarEvents, callback),
  getEventById: (eventId) => read(`${PATHS.calendarEvents}/${eventId}`),
  updateEventById: (eventId, value) => patch(`${PATHS.calendarEvents}/${eventId}`, value),
  deleteEventById: (eventId) => destroy(`${PATHS.calendarEvents}/${eventId}`),
};

export async function resetTasksDomain() {
  await Promise.all([
    write(PATHS.tasks, null),
    write(PATHS.dailyTasks, null),
    write(PATHS.habits, null),
  ]);
}

export async function resetEntireDatabase() {
  await write("/", null);
}
