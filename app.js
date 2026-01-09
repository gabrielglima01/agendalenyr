const STORAGE_KEY = "agenda_reunioes_v1";

const $ = (id) => document.getElementById(id);

const els = {
  form: $("form"),
  editId: $("editId"),
  date: $("date"),
  time: $("time"),
  duration: $("duration"),
  sector: $("sector"),
  requester: $("requester"),
  owner: $("owner"),
  subject: $("subject"),
  priority: $("priority"),
  status: $("status"),

  dayPicker: $("dayPicker"),
  weekPicker: $("weekPicker"),
  dayView: $("dayView"),
  weekView: $("weekView"),

  q: $("q"),
  fSector: $("fSector"),
  fPriority: $("fPriority"),
  fStatus: $("fStatus"),

  tbody: $("tbody"),

  btnReset: $("btnReset"),
  btnExport: $("btnExport"),
  fileImport: $("fileImport"),
  btnClear: $("btnClear"),
  btnToday: $("btnToday"),
  btnThisWeek: $("btnThisWeek"),
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function pad2(n){ return String(n).padStart(2, "0"); }

function formatBR(dateStr) {
  if (!dateStr) return "";
  const [y,m,d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function weekdayBR(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const names = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  return names[d.getDay()];
}

function toDate(dateStr){ return new Date(dateStr + "T00:00:00"); }

function sortItems(items) {
  return [...items].sort((a,b) => {
    const da = `${a.date}T${a.time || "00:00"}`;
    const db = `${b.date}T${b.time || "00:00"}`;
    return da.localeCompare(db);
  });
}

function badgePriority(p){
  const cls = p === "Alta" ? "b-alta" : p === "Média" ? "b-media" : "b-baixa";
  return `<span class="badge ${cls}">${p || "-"}</span>`;
}
function badgeStatus(s){
  const map = {
    "Pendente":"s-pendente",
    "Em andamento":"s-andamento",
    "Concluído":"s-concluido",
    "Cancelado":"s-cancelado",
  };
  return `<span class="badge ${map[s] || ""}">${s || "-"}</span>`;
}

function getFilters(){
  return {
    q: (els.q.value || "").trim().toLowerCase(),
    sector: els.fSector.value,
    priority: els.fPriority.value,
    status: els.fStatus.value,
  };
}

function applyFilters(items){
  const f = getFilters();
  return items.filter(it => {
    if (f.sector && it.sector !== f.sector) return false;
    if (f.priority && it.priority !== f.priority) return false;
    if (f.status && it.status !== f.status) return false;

    if (f.q) {
      const hay = [
        it.sector, it.requester, it.owner, it.subject, it.priority, it.status, it.time, it.date
      ].join(" ").toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}

function renderTable(items){
  const rows = items.map(it => `
    <tr>
      <td>${formatBR(it.date)}<div class="muted">${weekdayBR(it.date)}</div></td>
      <td>${it.time || ""}</td>
      <td>${it.sector || ""}</td>
      <td>${it.requester || ""}</td>
      <td>${it.duration || ""} min</td>
      <td>${it.owner || ""}</td>
      <td>${it.subject || ""}</td>
      <td>${badgePriority(it.priority)}</td>
      <td>${badgeStatus(it.status)}</td>
      <td>
        <div class="rowActions">
          <button class="btn small" data-edit="${it.id}">Editar</button>
          <button class="btn small danger ghost" data-del="${it.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");

  els.tbody.innerHTML = rows || `<tr><td colspan="10" class="muted">Sem registros.</td></tr>`;

  // bind actions
  els.tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.edit));
  });
  els.tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.dataset.del));
  });
}

function renderDay(items, dateStr){
  const dayItems = items.filter(it => it.date === dateStr);
  if (!dayItems.length){
    els.dayView.innerHTML = `<div class="muted">Sem reuniões para ${formatBR(dateStr)}.</div>`;
    return;
  }
  els.dayView.innerHTML = dayItems.map(it => `
    <div class="item">
      <div>
        <div><b>${it.time}</b> • ${it.sector} • ${it.subject}</div>
        <div class="meta">${it.requester} • Resp: ${it.owner} • ${it.duration} min</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
        ${badgePriority(it.priority)}
        ${badgeStatus(it.status)}
      </div>
    </div>
  `).join("");
}

function startOfWeek(dateStr){
  // Monday-based week
  const d = toDate(dateStr);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

function addDays(dateStr, n){
  const d = toDate(dateStr);
  d.setDate(d.getDate()+n);
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

function renderWeek(items, weekStart){
  const days = [
    {label:"Seg", off:0},
    {label:"Ter", off:1},
    {label:"Qua", off:2},
    {label:"Qui", off:3},
    {label:"Sex", off:4},
  ];
  els.weekView.innerHTML = days.map(d => {
    const date = addDays(weekStart, d.off);
    const list = items.filter(it => it.date === date);
    const slots = list.length
      ? list.map(it => `
          <div class="item" style="padding:8px 10px;">
            <div>
              <div><b>${it.time}</b> • ${it.sector}</div>
              <div class="meta">${it.subject}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
              ${badgePriority(it.priority)}
              ${badgeStatus(it.status)}
            </div>
          </div>
        `).join("")
      : `<div class="muted">Sem reuniões.</div>`;

    return `
      <div class="dayCol">
        <h3>${d.label}</h3>
        <div class="date">${formatBR(date)}</div>
        <div class="slots">${slots}</div>
      </div>
    `;
  }).join("");
}

function resetForm(){
  els.editId.value = "";
  els.form.reset();
  // status default
  els.status.value = "Pendente";
}

function startEdit(id){
  const data = loadData();
  const it = data.find(x => x.id === id);
  if (!it) return;

  els.editId.value = it.id;
  els.date.value = it.date;
  els.time.value = it.time;
  els.duration.value = it.duration;
  els.sector.value = it.sector;
  els.requester.value = it.requester;
  els.owner.value = it.owner;
  els.subject.value = it.subject;
  els.priority.value = it.priority;
  els.status.value = it.status;

  window.scrollTo({top:0, behavior:"smooth"});
}

function removeItem(id){
  const ok = confirm("Excluir este agendamento?");
  if (!ok) return;
  const data = loadData().filter(x => x.id !== id);
  saveData(data);
  refresh();
}

function refresh(){
  const data = sortItems(loadData());
  const filtered = applyFilters(data);
  renderTable(filtered);

  const day = els.dayPicker.value || todayStr();
  renderDay(data, day);

  const weekStart = startOfWeek(els.weekPicker.value || todayStr());
  renderWeek(data, weekStart);
}

function todayStr(){
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

// --- Events ---
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = loadData();

  const item = {
    id: els.editId.value || uid(),
    date: els.date.value,
    time: els.time.value,
    duration: Number(els.duration.value || 0),
    sector: els.sector.value,
    requester: els.requester.value.trim(),
    owner: els.owner.value.trim(),
    subject: els.subject.value,
    priority: els.priority.value,
    status: els.status.value,
  };

  // basic validation
  if (!item.date || !item.time || !item.sector || !item.requester || !item.owner || !item.subject || !item.priority || !item.status) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const idx = data.findIndex(x => x.id === item.id);
  if (idx >= 0) data[idx] = item;
  else data.push(item);

  saveData(data);
  resetForm();
  refresh();
});

els.btnReset.addEventListener("click", resetForm);

["input","change"].forEach(ev => {
  [els.q, els.fSector, els.fPriority, els.fStatus].forEach(el => el.addEventListener(ev, refresh));
});

els.dayPicker.addEventListener("change", refresh);
els.weekPicker.addEventListener("change", refresh);

els.btnToday.addEventListener("click", () => {
  els.dayPicker.value = todayStr();
  refresh();
});
els.btnThisWeek.addEventListener("click", () => {
  els.weekPicker.value = todayStr();
  refresh();
});

// Export/Import/Clear
els.btnExport.addEventListener("click", () => {
  const data = loadData();
  const blob = new Blob([JSON.stringify({version:1, exportedAt: new Date().toISOString(), items: data}, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `agenda_reunioes_backup_${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

els.fileImport.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    const text = await file.text();
    const json = JSON.parse(text);
    const items = Array.isArray(json) ? json : (json.items || []);
    if (!Array.isArray(items)) throw new Error("Formato inválido");
    saveData(items);
    alert("Importado com sucesso.");
    refresh();
  } catch(err){
    alert("Falha ao importar: " + err.message);
  } finally {
    e.target.value = "";
  }
});

els.btnClear.addEventListener("click", () => {
  const ok = confirm("Isso vai apagar TODOS os dados salvos neste navegador. Continuar?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  refresh();
});

// Init
(function init(){
  const t = todayStr();
  els.dayPicker.value = t;
  els.weekPicker.value = t;
  els.status.value = "Pendente";
  refresh();
})();
