// =========================
// FIREBASE IMPORT
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =========================
// FIREBASE CONFIG
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyAPHwqlZhzpE_fR3d5LuOpmTJQoxmMC-nM",
  authDomain: "database-tracking-29f0a.firebaseapp.com",
  databaseURL: "https://database-tracking-29f0a-default-rtdb.firebaseio.com",
  projectId: "database-tracking-29f0a",
  storageBucket: "database-tracking-29f0a.firebasestorage.app",
  messagingSenderId: "360569185652",
  appId: "1:360569185652:web:e4578b58055a72ee68f821"
};


// =========================
// INIT FIREBASE
// =========================

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);


// =========================
// STATS REFERENCES
// =========================

const statsRef = ref(db, "stats");


// =========================
// LOAD STATS FROM DATABASE
// =========================

function loadStats() {

  onValue(statsRef, (snapshot) => {

    const stats = snapshot.val();

    if (!stats) return;

    document.getElementById("atk").textContent = stats.atk;
    document.getElementById("int").textContent = stats.int;
    document.getElementById("disc").textContent = stats.disc;
    document.getElementById("cre").textContent = stats.cre;
    document.getElementById("end").textContent = stats.end;
    document.getElementById("foc").textContent = stats.foc;
    document.getElementById("wis").textContent = stats.wis;

    document.getElementById("level").textContent = stats.level;
    document.getElementById("exp").textContent = stats.exp;

  });

}


// =========================
// REWARD SYSTEM
// =========================

async function applyReward(reward) {

  const snapshot = await get(statsRef);

  const stats = snapshot.val();

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

  update(statsRef, updatedStats);

}


// =========================
// LEVEL SYSTEM
// =========================

function checkLevelUp(stats) {

  while (stats.exp >= stats.level * 100) {

    stats.exp -= stats.level * 100;

    stats.level += 1;

  }

}


// =========================
// DAILY TASK COMPLETE
// =========================

async function completeDailyTask(taskId) {

  const taskRef = ref(db, "dailyTasks/" + taskId);

  const snapshot = await get(taskRef);

  const task = snapshot.val();

  const today = new Date().toDateString();

  if (task.lastCompleted === today) {

    alert("Already completed today");

    return;

  }

  await applyReward(task.reward);

  update(taskRef, {

    lastCompleted: today

  });

}


// =========================
// LOAD DAILY TASKS
// =========================

function loadDailyTasks() {

  const dailyRef = ref(db, "dailyTasks");

  const list = document.getElementById("dailyTaskList");

  onValue(dailyRef, (snapshot) => {

    list.innerHTML = "";

    const tasks = snapshot.val();

    for (const id in tasks) {

      const task = tasks[id];

      const li = document.createElement("li");

      const button = document.createElement("button");

      button.textContent = task.title;

      button.onclick = () => completeDailyTask(id);

      li.appendChild(button);

      list.appendChild(li);

    }

  });

}


// =========================
// INIT APP
// =========================

function init() {

  loadStats();

  loadDailyTasks();

  loadTasks();

  loadNotes();

}

init();


const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const tasksRef = ref(db, "tasks");

addTaskBtn.onclick = async () => {

  const title = taskInput.value.trim();

  if (!title) return;

  const newTask = {
    title: title,
    description: "",
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now()
  };

  await push(tasksRef, newTask);

  taskInput.value = "";

};

function loadTasks(){

  onValue(tasksRef, (snapshot)=>{

    taskList.innerHTML="";

    const tasks = snapshot.val();
    if(!tasks) return;

    for(const id in tasks){

      const task = tasks[id];

      const li = document.createElement("li");
      li.textContent = task.title;

      taskList.appendChild(li);

    }

  });

}

const focusTimer = document.getElementById("focusTimer");
const focusButtons = document.querySelectorAll(".focus-controls button");

focusButtons.forEach(btn => {

  btn.onclick = () => startFocus(parseInt(btn.dataset.duration));

});

function startFocus(minutes){

  let seconds = minutes * 60;

  const interval = setInterval(()=>{

    seconds--;

    const m = Math.floor(seconds/60);
    const s = seconds % 60;

    focusTimer.textContent =
      String(m).padStart(2,"0") + ":" +
      String(s).padStart(2,"0");

    if(seconds <= 0){

      clearInterval(interval);

      applyReward({ foc:5, exp:10 });

    }

  },1000);

}


const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const notesList = document.getElementById("notesList");

const notesRef = ref(db,"notes");

saveNoteBtn.onclick = async ()=>{

  const content = noteInput.value.trim();
  if(!content) return;

  const note = {
    content: content,
    date: Date.now()
  };

  await push(notesRef,note);

  noteInput.value="";

};

function loadNotes(){

  onValue(notesRef,(snapshot)=>{

    notesList.innerHTML="";

    const notes = snapshot.val();
    if(!notes) return;

    for(const id in notes){

      const note = notes[id];

      const li = document.createElement("li");
      li.textContent = note.content;

      notesList.appendChild(li);

    }

  });

}

const amountInput = document.getElementById("amountInput");
const typeInput = document.getElementById("typeInput");
const addTransactionBtn = document.getElementById("addTransactionBtn");
const transactionList = document.getElementById("transactionList");

const financeRef = ref(db,"finance/transactions");

addTransactionBtn.onclick = async ()=>{

  const amount = Number(amountInput.value);

  if(!amount) return;

  const transaction = {

    amount: amount,
    type: typeInput.value,
    date: Date.now()

  };

  await push(financeRef,transaction);

  amountInput.value="";

};