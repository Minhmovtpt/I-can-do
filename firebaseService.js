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
  runTransaction
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

const paths = {
  stats: "stats",
  dailyTasks: "dailyTasks",
  tasks: "tasks",
  habits: "habits",
  notes: "notes",
  finance: "finance",
  financeTransactions: "finance/transactions",
  focusSessionState: "focus/sessionState",
  focusSessions: "focus/sessions",
  activityLog: "activityLog"
};

const activeListeners = new Map();

function pathRef(path) {
  return ref(db, path);
}

export function subscribe(path, callback) {
  const targetRef = pathRef(path);

  if (activeListeners.has(path)) {
    off(targetRef, "value", activeListeners.get(path));
  }

  const handler = (snapshot) => callback(snapshot.val());
  onValue(targetRef, handler);
  activeListeners.set(path, handler);

  return () => {
    off(targetRef, "value", handler);
    if (activeListeners.get(path) === handler) {
      activeListeners.delete(path);
    }
  };
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
  return paths;
}

export const statsApi = {
  get: () => read(paths.stats),
  set: (stats) => write(paths.stats, stats),
  transact: (updater) => transaction(paths.stats, updater)
};

export const tasksApi = {
  add: (task) => create(paths.tasks, task),
  subscribe: (callback) => subscribe(paths.tasks, callback),
  getById: (taskId) => read(`${paths.tasks}/${taskId}`),
  updateById: (taskId, value) => patch(`${paths.tasks}/${taskId}`, value),
  deleteById: (taskId) => destroy(`${paths.tasks}/${taskId}`)
};

export const notesApi = {
  add: (note) => create(paths.notes, note),
  subscribe: (callback) => subscribe(paths.notes, callback),
  getById: (noteId) => read(`${paths.notes}/${noteId}`),
  updateById: (noteId, value) => patch(`${paths.notes}/${noteId}`, value),
  deleteById: (noteId) => destroy(`${paths.notes}/${noteId}`)
};

export const financeApi = {
  addTransaction: (tx) => create(paths.financeTransactions, tx),
  subscribeTransactions: (callback) => subscribe(paths.financeTransactions, callback),
  patchFinance: (value) => patch(paths.finance, value),
  getTransactionById: (txId) => read(`${paths.financeTransactions}/${txId}`),
  updateTransactionById: (txId, value) => patch(`${paths.financeTransactions}/${txId}`, value),
  deleteTransactionById: (txId) => destroy(`${paths.financeTransactions}/${txId}`)
};

export const dailyTasksApi = {
  subscribe: (callback) => subscribe(paths.dailyTasks, callback),
  getById: (taskId) => read(`${paths.dailyTasks}/${taskId}`),
  patchById: (taskId, value) => patch(`${paths.dailyTasks}/${taskId}`, value)
};

export const habitsApi = {
  subscribe: (callback) => subscribe(paths.habits, callback),
  getById: (habitId) => read(`${paths.habits}/${habitId}`),
  patchById: (habitId, value) => patch(`${paths.habits}/${habitId}`, value)
};

export const focusApi = {
  getSessionState: () => read(paths.focusSessionState),
  setSessionState: (state) => write(paths.focusSessionState, state),
  clearSessionState: () => write(paths.focusSessionState, null),
  addSession: (session) => create(paths.focusSessions, session),
  subscribeSessions: (callback) => subscribe(paths.focusSessions, callback),
  getSessionById: (sessionId) => read(`${paths.focusSessions}/${sessionId}`),
  updateSessionById: (sessionId, value) => patch(`${paths.focusSessions}/${sessionId}`, value),
  deleteSessionById: (sessionId) => destroy(`${paths.focusSessions}/${sessionId}`)
};

export const activityApi = {
  addEntry: (entry) => create(paths.activityLog, entry),
  subscribe: (callback) => subscribe(paths.activityLog, callback)
};
