import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue,
  off
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

function pathRef(path) {
  return ref(db, path);
}

export function subscribe(path, callback) {
  const targetRef = pathRef(path);
  onValue(targetRef, (snapshot) => callback(snapshot.val()));
  return () => off(targetRef);
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

// Domain helpers
export function getPaths() {
  return paths;
}

export const statsApi = {
  get: () => read(paths.stats),
  set: (stats) => write(paths.stats, stats)
};

export const tasksApi = {
  addTask: (task) => create(paths.tasks, task),
  subscribe: (callback) => subscribe(paths.tasks, callback)
};

export const notesApi = {
  addNote: (note) => create(paths.notes, note),
  subscribe: (callback) => subscribe(paths.notes, callback)
};

export const financeApi = {
  addTransaction: (tx) => create(paths.financeTransactions, tx),
  subscribeTransactions: (callback) => subscribe(paths.financeTransactions, callback),
  patchFinance: (value) => patch(paths.finance, value)
};

export const dailyTasksApi = {
  subscribe: (callback) => subscribe(paths.dailyTasks, callback),
  getById: (taskId) => read(`${paths.dailyTasks}/${taskId}`),
  patchById: (taskId, value) => patch(`${paths.dailyTasks}/${taskId}`, value)
};

export const habitsApi = {
  subscribe: (callback) => subscribe(paths.habits, callback),
  patchById: (habitId, value) => patch(`${paths.habits}/${habitId}`, value)
};

export const focusApi = {
  getSessionState: () => read(paths.focusSessionState),
  setSessionState: (state) => write(paths.focusSessionState, state),
  clearSessionState: () => write(paths.focusSessionState, null),
  addSession: (session) => create(paths.focusSessions, session)
};

export const activityApi = {
  addEntry: (entry) => create(paths.activityLog, entry),
  subscribe: (callback) => subscribe(paths.activityLog, callback)
};
