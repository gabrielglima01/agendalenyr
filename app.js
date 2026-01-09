// ====== CONFIG ======
const API_URL = "https://script.google.com/macros/s/AKfycbwtGkqjVZ_X5ogZ44D7grvIjb3-A69uRVz8pkCxssfmojx5y_hlURYTcLBkIgSimJpBvg/exec"; // .../exec
const API_KEY = ""; // API_KEY

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

function pad2(n){ return String(n).padStart(2, "0"); }
function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function formatBR(dateStr){
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
function addDays(dateStr, n){
  const d = toDate(dateStr);
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function startOfWeek(dateStr){
  const d = toDate(dateStr);
  const day = d.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
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
    if (f.sector && it.setor !== f.sector) return false;
    if (f.priority && it.prioridade !== f.priority) return false;
    if (f.status && it.status !== f.status) return false;

    if (f.q) {
      const hay = [
        it.setor, it.solicitante, it.responsavel, it.assunto, it.prioridade, it.status, it.hora, it.data
      ].join(" ").toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}

// ====== API ======
async function apiGetList(){
  const url = `${API_URL}?action=list&key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro API");
  return json.items || [];
}

async function apiCreate(item){
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action:"create", ...item })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro create");
  return json.id;
}

async function apiUpdate(id, item){
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action:"update", id, ...item })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro update");
}

async function apiRemove(id){
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action:"remove", id })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro remove");
}

// ====== UI render ======
function renderTable(items){
  const rows = items.map(it => `
    <tr>
      <td>${formatBR(it.data)}<div class="muted">${weekdayBR(it.data)}</div></td>
      <td>${it.hora || ""}</td>
      <td>${it.setor || ""}</td>
      <td>${it.solicitante || ""}</td>
      <td>${it.duracaoMin || ""} min</td>
      <td>${it.responsavel || ""}</td>
      <td>${it.assunto || ""}</td>
      <td>${badgePriority(it.prioridade)}</td>
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

  els.tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.edit));
  });
  els.tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.dataset.del));
  });
}

function renderDay(items, dateStr){
  const dayItems = items.filter(it => it.data === dateStr);
  if (!dayItems.length){
    els.dayView.innerHTML = `<div class="muted">Sem reuniões para ${formatBR(dateStr)}.</div>`;
    return;
  }
  els.dayView.innerHTML = dayItems.map(it => `
    <div class="item">
      <div>
        <div><b>${it.hora}</b> • ${it.setor} • ${it.assunto}</div>
        <div class="meta">${it.solicitante} • Resp: ${it.responsavel} • ${it.duracaoMin} min</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
        ${badgePriority(it.prioridade)}
        ${badgeStatus(it.status)}
      </div>
    </div>
  `).join("");
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
    const list = items.filter(it => it.data === date);
    const slots = list.length
      ? list.map(it => `
          <div class="item" style="padding:8px 10px;">
            <div>
              <div><b>${it.hora}</b> • ${it.setor}</div>
              <div class="meta">${it.assunto}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
              ${badgePriority(it.prioridade)}
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

// ====== State ======
let ALL = [];

function resetForm(){
  els.editId.value = "";
  els.form.reset();
  els.status.value = "Pendente";
}

function startEdit(id){
  const it = ALL.find(x => x.id === id);
  if (!it) return;

  els.editId.value = it.id;
  els.date.value = it.data;
  els.time.value = it.hora;
  els.duration.value = it.duracaoMin;
  els.sector.value = it.setor;
  els.requester.value = it.solicitante;
  els.owner.value = it.responsavel;
  els.subject.value = it.assunto;
  els.priority.value = it.prioridade;
  els.status.value = it.status;

  window.scrollTo({top:0, behavior:"smooth"});
}

async function removeItem(id){
  const ok = confirm("Excluir este agendamento?");
  if (!ok) return;
  await apiRemove(id);
  await refresh();
}

function refreshUI(){
  const filtered = applyFilters(ALL);
  renderTable(filtered);

  const day = els.dayPicker.value || todayStr();
  renderDay(ALL, day);

  const weekStart = startOfWeek(els.weekPicker.value || todayStr());
  renderWeek(ALL, weekStart);
}

async function refresh(){
  ALL = (await apiGetList()) || [];
  // ordenar por data/hora
  ALL.sort((a,b) => (`${a.data}T${a.hora}`).localeCompare(`${b.data}T${b.hora}`));
  refreshUI();
}

// ====== Events ======
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    data: els.date.value,
    hora: els.time.value,
    duracaoMin: Number(els.duration.value || 0),
    setor: els.sector.value,
    solicitante: els.requester.value.trim(),
    responsavel: els.owner.value.trim(),
    assunto: els.subject.value,
    prioridade: els.priority.value,
    status: els.status.value,
  };

  if (!payload.data || !payload.hora || !payload.setor || !payload.solicitante || !payload.responsavel || !payload.assunto || !payload.prioridade || !payload.status) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const id = els.editId.value;
  if (id) await apiUpdate(id, payload);
  else await apiCreate(payload);

  resetForm();
  await refresh();
});

els.btnReset.addEventListener("click", resetForm);

["input","change"].forEach(ev => {
  [els.q, els.fSector, els.fPriority, els.fStatus].forEach(el => el.addEventListener(ev, refreshUI));
});

els.dayPicker.addEventListener("change", refreshUI);
els.weekPicker.addEventListener("change", refreshUI);

els.btnToday.addEventListener("click", () => {
  els.dayPicker.value = todayStr();
  refreshUI();
});
els.btnThisWeek.addEventListener("click", () => {
  els.weekPicker.value = todayStr();
  refreshUI();
});

// Export/Import (agora exporta a lista do servidor)
els.btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), items: ALL}, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `agenda_reunioes_backup_${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Import: envia itens para o servidor (create)
els.fileImport.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    const text = await file.text();
    const json = JSON.parse(text);
    const items = Array.isArray(json) ? json : (json.items || []);
    if (!Array.isArray(items)) throw new Error("Formato inválido");

    for (const it of items) {
      // cria registros novos (não reaproveita id antigo)
      await apiCreate({
        data: it.data || it.date || "",
        hora: it.hora || it.time || "",
        duracaoMin: Number(it.duracaoMin || it.duration || 0),
        setor: it.setor || it.sector || "",
        solicitante: it.solicitante || it.requester || "",
        responsavel: it.responsavel || it.owner || "",
        assunto: it.assunto || it.subject || "",
        prioridade: it.prioridade || it.priority || "",
        status: it.status || ""
      });
    }

    alert("Importado com sucesso.");
    await refresh();
  } catch(err){
    alert("Falha ao importar: " + err.message);
  } finally {
    e.target.value = "";
  }
});

// Limpar (no multiusuário, não vamos apagar tudo por padrão)
els.btnClear.addEventListener("click", () => {
  alert("No modo multiusuário, a limpeza total deve ser feita pela planilha (ou posso adicionar um endpoint admin).");
});

// Init
(async function init(){
  const t = todayStr();
  els.dayPicker.value = t;
  els.weekPicker.value = t;
  els.status.value = "Pendente";
  try {
    await refresh();
  } catch (e) {
    console.error(e);
    alert("Falha ao conectar na API. Verifique API_URL/API_KEY e se o Web App foi implantado.");
  }
})();


