import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const isConfigured = !SUPABASE_URL.includes("YOUR-PROJECT-REF") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const SCORE_FIELDS = [
  ["score_academic", "Academic & Research Fit"],
  ["score_funding", "Funding Strength"],
  ["score_admissions", "Admissions Feasibility"],
  ["score_career", "Career Outcomes"],
  ["score_environment", "Environment & Logistics"],
  ["score_personal", "Practical & Personal Fit"],
];

let state = { schools: [], recommenders: [], materials: [] };
let charts = { total: null, category: null };
let aiResult = null;

// ---------------- View switching ----------------
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  const view = btn.dataset.view;
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");
  if (view === "dashboard") renderDashboard();
});

if (!isConfigured) {
  document.getElementById("connBanner").hidden = false;
}

// ---------------- Data loading ----------------
async function loadAll() {
  if (!isConfigured) {
    renderSchools(); renderRecommenders(); renderMaterials();
    renderDashboard();
    return;
  }
  const [{ data: schools, error: e1 }, { data: recommenders, error: e2 }, { data: materials, error: e3 }] =
    await Promise.all([
      supabase.from("schools").select("*").order("created_at", { ascending: true }),
      supabase.from("recommenders").select("*").order("created_at", { ascending: true }),
      supabase.from("application_materials").select("*"),
    ]);
  if (e1 || e2 || e3) {
    console.error(e1 || e2 || e3);
    alert("Couldn't load data from Supabase. Check config.js and your table setup (see supabase-schema.sql).");
    return;
  }
  state.schools = schools || [];
  state.recommenders = recommenders || [];
  state.materials = materials || [];
  document.getElementById("lastSynced").textContent = `synced ${new Date().toLocaleTimeString()}`;
  renderSchools();
  renderRecommenders();
  renderMaterials();
}

function totalScore(s) {
  return SCORE_FIELDS.reduce((sum, [f]) => sum + (Number(s[f]) || 0), 0);
}

function bestSchoolId() {
  if (!state.schools.length) return null;
  return state.schools.reduce((best, s) => (totalScore(s) > totalScore(best) ? s : best)).id;
}

function statusClass(status) {
  return "status-" + (status || "").toLowerCase().replace(/[^a-z]/g, "");
}

// ---------------- Schools rendering ----------------
function renderSchools() {
  const grid = document.getElementById("schoolGrid");
  grid.innerHTML = "";
  const bestId = bestSchoolId();

  if (!state.schools.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.innerHTML = 'No schools in the dossier yet. <button type="button" class="text-action">Add your first school</button>.';
    empty.querySelector("button").addEventListener("click", () => openSchoolModal(null));
    grid.appendChild(empty);
  }

  state.schools.forEach(s => {
    const total = totalScore(s);
    const card = document.createElement("div");
    card.className = "school-card";
    card.tabIndex = 0;
    card.innerHTML = `
      ${s.id === bestId ? '<div class="card-best-flag">★ BEST FIT</div>' : ""}
      <div class="school-card-top">
        <div>
          <p class="school-name">${escapeHtml(s.name || "Untitled")}</p>
          <p class="school-country">${escapeHtml(s.country || "")}</p>
        </div>
        <div class="stamp-badge ${statusClass(s.status)}">${escapeHtml(s.status || "—")}</div>
      </div>
      <div class="school-meta">
        <div><span class="k">Deadline</span>${escapeHtml(s.deadline || "—")}</div>
        <div><span class="k">Advisors</span>${escapeHtml(s.prospective_advisors || "—")}</div>
        <div><span class="k">Stipend</span>${escapeHtml(s.stipend_total || "—")}</div>
      </div>
      <div class="score-block">
        <div class="score-total">${total} <span style="font-size:13px;font-family:var(--font-mono);color:#7a6d4f;">/ 30</span></div>
        <div class="score-bars">
          ${SCORE_FIELDS.map(([f]) => `<div class="score-bar"><i style="width:${(Number(s[f]) || 0) * 20}%"></i></div>`).join("")}
        </div>
      </div>
    `;
    card.addEventListener("click", () => openSchoolModal(s));
    grid.appendChild(card);
  });

  const addCard = document.createElement("div");
  addCard.className = "add-card";
  addCard.textContent = "+ Add school";
  addCard.addEventListener("click", () => openSchoolModal(null));
  grid.appendChild(addCard);
}

document.getElementById("btnAddSchool").addEventListener("click", () => openSchoolModal(null));

const schoolModal = document.getElementById("schoolModal");
const schoolForm = document.getElementById("schoolForm");
let editingSchoolId = null;

function openSchoolModal(school) {
  editingSchoolId = school ? school.id : null;
  document.getElementById("schoolModalTitle").textContent = school ? `Edit ${school.name}` : "Add school";
  document.getElementById("btnDeleteSchool").hidden = !school;
  schoolForm.reset();
  if (school) {
    Object.entries(school).forEach(([k, v]) => {
      const field = schoolForm.elements[k];
      if (field) field.value = v ?? "";
    });
  }
  schoolModal.showModal();
}

document.getElementById("btnCancelSchool").addEventListener("click", () => schoolModal.close());

schoolForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!schoolForm.reportValidity()) return;
  const formData = new FormData(schoolForm);
  const payload = {};
  for (const [k, v] of formData.entries()) {
    payload[k] = k.startsWith("score_") ? (v === "" ? null : Number(v)) : v;
  }
  if (payload.deadline && payload.deadline.length > 100) {
    alert("Enter a shorter deadline or date range.");
    return;
  }
  if (!isConfigured) {
    alert("Connect Supabase first (see config.js) before saving.");
    return;
  }
  let error;
  if (editingSchoolId) {
    ({ error } = await supabase.from("schools").update(payload).eq("id", editingSchoolId));
  } else {
    ({ error } = await supabase.from("schools").insert(payload));
  }
  if (error) { alert("Save failed: " + error.message); return; }
  await loadAll();
});

document.getElementById("btnDeleteSchool").addEventListener("click", async () => {
  if (!editingSchoolId) return;
  if (!isConfigured) { alert("Connect Supabase first (see config.js) before deleting."); return; }
  if (!confirm("Delete this school?")) return;
  const { error } = await supabase.from("schools").delete().eq("id", editingSchoolId);
  if (error) { alert("Delete failed: " + error.message); return; }
  schoolModal.close();
  await loadAll();
});

// ---------------- Dashboard ----------------
function renderDashboard() {
  const bestId = bestSchoolId();
  const best = state.schools.find(s => s.id === bestId);
  document.getElementById("stampName").textContent = best ? best.name : "—";
  document.getElementById("stampScore").textContent = best ? `${totalScore(best)} / 30` : "— / 30";
  document.getElementById("bestStamp").classList.toggle("is-empty", !best);
  const hasSchools = state.schools.length > 0;
  document.getElementById("btnAiRecommend").disabled = !hasSchools;
  document.getElementById("aiStatus").textContent = hasSchools ? "" : "Add a school to compare programs and request a field report.";
  document.querySelector(".chart-row").hidden = !hasSchools;
  renderFieldReport();

  // Ledger table
  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";
  if (!state.schools.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No scores yet. Add a school to build your ledger.</td></tr>';
  }
  state.schools.forEach(s => {
    const tr = document.createElement("tr");
    if (s.id === bestId) tr.classList.add("is-best");
    tr.innerHTML = `
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.country || "—")}</td>
      ${SCORE_FIELDS.map(([f]) => `<td>${s[f] ?? "—"}</td>`).join("")}
      <td class="total-cell">${totalScore(s)}</td>
    `;
    tbody.appendChild(tr);
  });

  const labels = state.schools.map(s => s.name);
  const totals = state.schools.map(s => totalScore(s));

  if (charts.total) charts.total.destroy();
  if (charts.category) charts.category.destroy();
  charts.total = null;
  charts.category = null;
  if (!state.schools.length) return;
  charts.total = new Chart(document.getElementById("chartTotal"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: totals,
        backgroundColor: state.schools.map(s => s.id === bestId ? "#3F6B4F" : "#3B5BA5"),
        borderRadius: 3,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 30, ticks: { color: "#7C8B9A" }, grid: { color: "#222C38" } },
        x: { ticks: { color: "#F2EFE9" }, grid: { display: false } },
      },
    },
  });

  charts.category = new Chart(document.getElementById("chartCategory"), {
    type: "bar",
    data: {
      labels: SCORE_FIELDS.map(([, label]) => label),
      datasets: state.schools.map((s, i) => ({
        label: s.name,
        data: SCORE_FIELDS.map(([f]) => s[f] || 0),
        backgroundColor: ["#B8935A", "#3B5BA5", "#3F6B4F", "#C1442D", "#7C8B9A"][i % 5],
        borderRadius: 3,
      })),
    },
    options: {
      plugins: { legend: { labels: { color: "#F2EFE9" } } },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { color: "#7C8B9A" }, grid: { color: "#222C38" } },
        x: { ticks: { color: "#F2EFE9", font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
}

function renderFieldReport() {
  const report = document.getElementById("fieldReport");
  if (!aiResult) {
    report.hidden = true;
    report.innerHTML = "";
    return;
  }
  const ranking = Array.isArray(aiResult.ranking) ? aiResult.ranking : [];
  report.hidden = false;
  report.innerHTML = `
    <div class="field-report-head"><span>Field report</span><span>AI analysis</span></div>
    <p class="report-recommendation">${escapeHtml(aiResult.recommendation || "No overall recommendation was returned.")}</p>
    <ol class="report-ranking">
      ${ranking.map(item => `<li><strong>${escapeHtml(item.name || "Unnamed school")}</strong><span>${escapeHtml(item.rationale || "No rationale provided.")}</span></li>`).join("")}
    </ol>`;
}

document.getElementById("btnAiRecommend").addEventListener("click", async () => {
  const status = document.getElementById("aiStatus");
  const button = document.getElementById("btnAiRecommend");
  if (!isConfigured) { status.textContent = "Connect Supabase first; the report runs through the deployed edge function."; return; }
  if (!state.schools.length) { status.textContent = "Add a school before requesting a field report."; return; }
  button.disabled = true;
  button.textContent = "Preparing report...";
  status.textContent = "Comparing the dossier...";
  try {
    const { data, error } = await supabase.functions.invoke("rank-schools", {
      body: { schools: state.schools, goal: document.getElementById("aiGoal").value.trim() },
    });
    if (error) throw error;
    if (!data || data.error) throw new Error(data?.error || "The edge function returned no report.");
    aiResult = data;
    status.textContent = "Field report ready.";
    renderFieldReport();
  } catch (error) {
    console.error(error);
    status.textContent = "The field report could not be generated. Deploy rank-schools and check its Gemini API key, then try again.";
  } finally {
    button.disabled = !state.schools.length;
    button.textContent = "Get AI recommendation";
  }
});

// ---------------- Recommenders ----------------
function renderRecommenders() {
  const tbody = document.querySelector("#recommenderTable tbody");
  tbody.innerHTML = "";
  if (!state.recommenders.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No recommenders yet. Add someone who knows your work.</td></tr>';
    return;
  }
  state.recommenders.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.title || "—")}</td>
      <td>${escapeHtml(r.email || "—")}</td>
      <td>${escapeHtml(r.phone || "—")}</td>
      <td class="actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Delete</button>
      </td>
    `;
    tr.querySelector('[data-action="edit"]').addEventListener("click", () => openRecommenderModal(r));
    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!isConfigured) { alert("Connect Supabase first (see config.js) before deleting."); return; }
      if (!confirm(`Delete ${r.name}?`)) return;
      const { error } = await supabase.from("recommenders").delete().eq("id", r.id);
      if (error) { alert("Delete failed: " + error.message); return; }
      await loadAll();
    });
    tbody.appendChild(tr);
  });
}

document.getElementById("btnAddRecommender").addEventListener("click", () => openRecommenderModal(null));

const recommenderModal = document.getElementById("recommenderModal");
const recommenderForm = document.getElementById("recommenderForm");
let editingRecommenderId = null;

function openRecommenderModal(r) {
  editingRecommenderId = r ? r.id : null;
  document.getElementById("recommenderModalTitle").textContent = r ? `Edit ${r.name}` : "Add recommender";
  document.getElementById("btnDeleteRecommender").hidden = !r;
  recommenderForm.reset();
  if (r) {
    Object.entries(r).forEach(([k, v]) => {
      const field = recommenderForm.elements[k];
      if (field) field.value = v ?? "";
    });
  }
  recommenderModal.showModal();
}

document.getElementById("btnCancelRecommender").addEventListener("click", () => recommenderModal.close());

recommenderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!recommenderForm.reportValidity()) return;
  const formData = new FormData(recommenderForm);
  const payload = Object.fromEntries(formData.entries());
  if (!isConfigured) {
    alert("Connect Supabase first (see config.js) before saving.");
    return;
  }
  let error;
  if (editingRecommenderId) {
    ({ error } = await supabase.from("recommenders").update(payload).eq("id", editingRecommenderId));
  } else {
    ({ error } = await supabase.from("recommenders").insert(payload));
  }
  if (error) { alert("Save failed: " + error.message); return; }
  await loadAll();
});

document.getElementById("btnDeleteRecommender").addEventListener("click", async () => {
  if (!editingRecommenderId) return;
  if (!confirm("Delete this recommender?")) return;
  const { error } = await supabase.from("recommenders").delete().eq("id", editingRecommenderId);
  if (error) { alert("Delete failed: " + error.message); return; }
  recommenderModal.close();
  await loadAll();
});

// ---------------- Materials ----------------
function renderMaterials() {
  const grid = document.getElementById("materialsGrid");
  grid.innerHTML = "";
  if (!state.materials.length) {
    grid.innerHTML = '<p class="empty-state">No material sections loaded. Run the schema seed, then reload.</p>';
    return;
  }
  state.materials.forEach(m => {
    const folder = document.createElement("div");
    folder.className = "material-folder";
    folder.innerHTML = `
      <h4>${escapeHtml(m.section)}</h4>
      <textarea>${escapeHtml(m.content || "")}</textarea>
      <div class="save-row"><button>Save</button></div>
    `;
    folder.querySelector("button").addEventListener("click", async () => {
      const content = folder.querySelector("textarea").value;
      if (!isConfigured) { alert("Connect Supabase first (see config.js) before saving."); return; }
      const { error } = await supabase.from("application_materials").update({ content, updated_at: new Date().toISOString() }).eq("id", m.id);
      if (error) { alert("Save failed: " + error.message); return; }
      m.content = content;
      document.getElementById("lastSynced").textContent = `synced ${new Date().toLocaleTimeString()}`;
    });
    grid.appendChild(folder);
  });
}

// ---------------- Utils ----------------
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

loadAll();
