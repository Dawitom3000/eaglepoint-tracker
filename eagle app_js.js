import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase config (your keys) ───────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDjjqKAsOGRvBd5d_U49y9m3LcpVBUNhlo",
  authDomain:        "eaglepoint-tracker.firebaseapp.com",
  projectId:         "eaglepoint-tracker",
  storageBucket:     "eaglepoint-tracker.firebasestorage.app",
  messagingSenderId: "294710893775",
  appId:             "1:294710893775:web:09f0b5e90de366dc4d2bba",
  measurementId:     "G-4ZQ3RG8PXR"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

// ── Constants ─────────────────────────────────────────────────
const QUOTA   = 25;
const WEEKLY  = 6;
const PM_PASS = "eagle2026";   // ← change this to your own password

const DEVS = [
  "Alex T.", "Biruk M.", "Chaltu D.", "Eden G.", "Fiker S.",
  "Getnet H.", "Hana W.", "Iyasu B.", "Jonas K.", "Kiya L.",
  "Liya F.", "Mekdes R.", "Nati S.", "Yonas T.", "Zeleke A."
];

// ── State ─────────────────────────────────────────────────────
let currentWeek = 1;
let allSubmissions = [];   // [{name, tasks, status, blocker, date, week}]

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

function segment(tasks, w) {
  const proj = w > 0 ? (tasks / w) * 4 : tasks;
  if (proj >= 25) return { label: "High performer", cls: "seg-high",       color: "#1D9E75" };
  if (proj >= 20) return { label: "On track",       cls: "seg-ontrack",    color: "#185FA5" };
  if (proj >= 13) return { label: "Struggling",     cls: "seg-struggling", color: "#BA7517" };
  return               { label: "At risk",          cls: "seg-risk",       color: "#A32D2D" };
}

const statusIcon  = { green: "✅", yellow: "🟡", red: "🔴" };
const statusLabel = { green: "On track", yellow: "Slower", red: "Stuck / blocked" };

// ── View switching ────────────────────────────────────────────
window.showView = function(id) {
  ["landing","dev","pm-login","pm-dash"].forEach(v =>
    document.getElementById(v).style.display = "none"
  );
  const el = document.getElementById(id);
  el.style.display = (id === "landing") ? "flex" : "block";
  if (id === "dev")     initDevForm();
  if (id === "pm-dash") loadDashboard();
};

// ── Dev form ──────────────────────────────────────────────────
function initDevForm() {
  const sel = document.getElementById("dev-name");
  sel.innerHTML = '<option value="">— Select your name —</option>';
  DEVS.forEach(n => {
    const o = document.createElement("option");
    o.value = o.textContent = n;
    sel.appendChild(o);
  });
  document.getElementById("dev-tasks").value = 0;
  document.getElementById("dev-blocker").value = "";
  document.querySelectorAll(".status-btn").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  document.getElementById("already-msg").style.display  = "none";
  document.getElementById("dev-success").style.display  = "none";
}

window.selectStatus = function(btn) {
  document.querySelectorAll(".status-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
};

window.checkAlreadySubmitted = async function() {
  const name = document.getElementById("dev-name").value;
  if (!name) return;
  const snap = await getDocs(collection(db, "checkins"));
  const exists = snap.docs.some(d => {
    const data = d.data();
    return data.name === name && data.date === today();
  });
  document.getElementById("already-msg").style.display = exists ? "block" : "none";
};

window.submitCheckin = async function() {
  const name    = document.getElementById("dev-name").value;
  const tasks   = parseInt(document.getElementById("dev-tasks").value) || 0;
  const status  = document.querySelector(".status-btn.active")?.dataset.val || "green";
  const blocker = document.getElementById("dev-blocker").value.trim();
  if (!name) return alert("Please select your name.");

  const docId = `${name}_${today()}`;
  await setDoc(doc(db, "checkins", docId), { name, tasks, status, blocker, date: today(), week: currentWeek });

  document.getElementById("dev-success").style.display = "block";
  document.getElementById("already-msg").style.display = "none";
  setTimeout(() => { document.getElementById("dev-success").style.display = "none"; }, 3000);
};

// ── PM login ──────────────────────────────────────────────────
window.pmLogin = function() {
  const pass = document.getElementById("pm-pass").value;
  if (pass === PM_PASS) {
    showView("pm-dash");
  } else {
    const el = document.getElementById("wrong-pass");
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 2000);
  }
};

// ── Load dashboard data ───────────────────────────────────────
window.loadDashboard = async function() {
  const snap = await getDocs(collection(db, "checkins"));
  allSubmissions = snap.docs.map(d => d.data());
  renderOverview();
  renderBlockers();
  renderSummary();
};

window.setWeek = function(w) {
  currentWeek = parseInt(w);
  renderOverview();
  renderSummary();
};

// ── Tab switching ─────────────────────────────────────────────
window.switchTab = function(tab, btn) {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  ["overview","blockers","summary","aquila"].forEach(t =>
    document.getElementById("tab-"+t).style.display = t === tab ? "block" : "none"
  );
};

// ── Build per-dev map ─────────────────────────────────────────
function buildDevMap() {
  const map = {};
  DEVS.forEach(n => { map[n] = { name: n, tasks: 0, status: "green", blocker: "", lastSeen: "", subs: [] }; });
  allSubmissions.forEach(s => {
    if (!map[s.name]) return;
    map[s.name].tasks += s.tasks;
    map[s.name].subs.push(s);
    if (s.date > map[s.name].lastSeen) {
      map[s.name].lastSeen = s.date;
      map[s.name].status   = s.status;
      map[s.name].blocker  = s.blocker;
    }
  });
  return Object.values(map);
}

// ── Render overview ───────────────────────────────────────────
function renderOverview() {
  const devs  = buildDevMap();
  const w     = currentWeek;
  const total = devs.reduce((s, d) => s + d.tasks, 0);
  const reportedToday = devs.filter(d => d.lastSeen === today()).length;
  const blockers = devs.filter(d => d.status === "red" || d.blocker).length;
  const pct   = Math.round((total / (DEVS.length * QUOTA)) * 100);

  document.getElementById("metrics").innerHTML = [
    { l: "Total tasks",     v: total,           h: `of ${DEVS.length * QUOTA} target` },
    { l: "Reported today",  v: reportedToday,   h: `of ${DEVS.length} devs` },
    { l: "Blockers",        v: blockers,         h: "need attention" },
    { l: "Completion",      v: pct + "%",        h: "monthly quota" },
  ].map(m => `
    <div class="metric">
      <div class="m-label">${m.l}</div>
      <div class="m-val">${m.v}</div>
      <div class="m-hint">${m.h}</div>
    </div>`).join("");

  document.getElementById("dev-list").innerHTML = devs.map(d => {
    const s   = segment(d.tasks, w);
    const pct = Math.min(100, Math.round((d.tasks / QUOTA) * 100));
    const seen = d.lastSeen === today() ? "today" : d.lastSeen || "no data";
    return `
      <div class="dev-row">
        <div class="dev-name">${d.name}</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
        <div class="dev-count">${d.tasks}/${QUOTA}</div>
        <span class="badge ${s.cls}">${s.label}</span>
        <span class="status-icon">${statusIcon[d.status] || "✅"}</span>
        <span class="last-seen">${seen}</span>
      </div>`;
  }).join("");
}

// ── Render blockers ───────────────────────────────────────────
function renderBlockers() {
  const devs     = buildDevMap();
  const blockers = devs.filter(d => d.status === "red" || d.blocker);
  const el       = document.getElementById("blocker-list");

  if (!blockers.length) {
    el.innerHTML = '<p style="color:#6b6b67;padding:2rem 0">No blockers reported today. ✅</p>';
    return;
  }
  el.innerHTML = blockers.map(d => `
    <div class="blocker-card">
      <div class="blocker-head">
        <div>
          <div class="blocker-name">${d.name}</div>
          <div class="blocker-meta">${d.tasks} tasks · Last seen: ${d.lastSeen || "never"}</div>
        </div>
        <span class="badge seg-risk">${statusIcon[d.status]} ${statusLabel[d.status]}</span>
      </div>
      ${d.blocker ? `<div class="blocker-text"><span style="color:#6b6b67;margin-right:6px">Blocker:</span>${d.blocker}</div>` : ""}
    </div>`).join("");
}

// ── Render summary ────────────────────────────────────────────
function renderSummary() {
  const devs  = buildDevMap();
  const w     = currentWeek;
  const total = devs.reduce((s, d) => s + d.tasks, 0);
  const segs  = { "High performer": 0, "On track": 0, "Struggling": 0, "At risk": 0 };
  devs.forEach(d => { segs[segment(d.tasks, w).label]++; });
  const blockers  = devs.filter(d => d.status === "red" || d.blocker);
  const pct       = Math.round((total / (DEVS.length * QUOTA)) * 100);
  const atRisk    = segs["At risk"] + segs["Struggling"];
  const reportedToday = devs.filter(d => d.lastSeen === today()).length;

  document.getElementById("summary-text").textContent =
`Weekly Update — Week ${w} of 4

Progress: Team completed ${total} tasks (monthly target: ${DEVS.length * QUOTA})
Completion rate: ${pct}%
Reported today: ${reportedToday}/${DEVS.length} devs

Team breakdown:
• High performers : ${segs["High performer"]} devs
• On track        : ${segs["On track"]} devs
• Struggling      : ${segs["Struggling"]} devs
• At risk         : ${segs["At risk"]} devs

Active blockers: ${blockers.length}
${blockers.map(d => `• ${d.name}${d.blocker ? ": " + d.blocker : ""}`).join("\n") || "• None"}

Next week focus:
• Follow up with ${atRisk} underperforming dev(s)
• Weekly team target: ${DEVS.length * WEEKLY} tasks`;
}

window.copySummary = function() {
  const txt = document.getElementById("summary-text").textContent;
  navigator.clipboard?.writeText(txt).then(() => alert("Copied to clipboard!"));
};

// ── Aquila sync ───────────────────────────────────────────────
window.syncToAquila = async function() {
  const key = document.getElementById("aquila-key").value.trim();
  const url = document.getElementById("aquila-url").value.trim();
  const res = document.getElementById("aquila-result");

  if (!key || !url) {
    res.textContent = "⚠️ Please enter both the API key and endpoint URL to sync.";
    return;
  }
  const devs    = buildDevMap();
  const payload = { week: currentWeek, date: today(), team: devs.map(d => ({
    name: d.name, tasks: d.tasks, status: d.status, blocker: d.blocker
  }))};

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(payload)
    });
    res.textContent = r.ok ? "✅ Successfully synced to Aquila." : `❌ Aquila returned error: ${r.status}`;
  } catch (e) {
    res.textContent = "❌ Could not reach Aquila endpoint. Check the URL and try again.";
  }
};

// ── CSV export ────────────────────────────────────────────────
window.exportCSV = function() {
  const devs = buildDevMap();
  const rows = [["Name","Tasks","Status","Blocker","Last Seen","Segment"]];
  devs.forEach(d => {
    const s = segment(d.tasks, currentWeek);
    rows.push([d.name, d.tasks, statusLabel[d.status] || d.status, d.blocker || "", d.lastSeen || "", s.label]);
  });
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `eaglepoint-week${currentWeek}-${today()}.csv`;
  a.click();
};

// ── Reset month ───────────────────────────────────────────────
window.resetMonth = async function() {
  if (!confirm("Reset all data for a new month? This cannot be undone.")) return;
  const snap = await getDocs(collection(db, "checkins"));
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "checkins", d.id))));
  allSubmissions = [];
  currentWeek = 1;
  document.getElementById("week-sel").value = 1;
  renderOverview();
  renderBlockers();
  renderSummary();
};

// ── Init ──────────────────────────────────────────────────────
showView("landing");
