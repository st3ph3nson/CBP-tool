const els = {
  q: document.getElementById("q"),
  results: document.getElementById("results"),
  empty: document.getElementById("empty"),
  count: document.getElementById("count"),
  resetBtn: document.getElementById("resetBtn"),
  resetSideBtn: document.getElementById("resetSideBtn"),

  catList: document.getElementById("catList"),
  application: document.getElementById("application"),
  substrate: document.getElementById("substrate"),
  tileType: document.getElementById("tileType"),

  modalBackdrop: document.getElementById("modalBackdrop"),
  modalTitle: document.getElementById("modalTitle"),
  modalSub: document.getElementById("modalSub"),
  modalBody: document.getElementById("modalBody"),
  closeModal: document.getElementById("closeModal"),
  modalDownload: document.getElementById("modalDownload")
};

let DATA = null;
let state = {
  category: "Stone Tile",   // default like your screenshot
  application: "Exterior Floors",
  substrate: "",
  tileType: "",
  query: ""
};

function norm(s){ return (s || "").toString().trim().toLowerCase(); }

function uniq(arr){
  return Array.from(new Set(arr.filter(Boolean)));
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function systemMatches(system){
  // Category filter
  if (state.category && system.category !== state.category) return false;

  // Advanced filters
  if (state.application && system.application_type !== state.application) return false;
  if (state.substrate && system.substrate !== state.substrate) return false;
  if (state.tileType && system.tile_type !== state.tileType) return false;

  // Keyword search
  const q = norm(state.query);
  if (!q) return true;

  const hay = [
    system.system_id,
    system.cbp_method,
    system.industry_method,
    system.category,
    system.tile_type,
    system.application_type,
    system.substrate,
    system.description,
    ...(system.keywords || []),
    ...Object.values(system.products || {}).flat()
  ].map(norm).join(" | ");

  // Allow multi-word searching
  return q.split(/\s+/).every(word => hay.includes(word));
}

function renderCards(list){
  els.results.innerHTML = "";

  for (const s of list){
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="cardGrid">
        <div class="kv">
          <div class="k">CBP Method</div>
          <div class="v">${escapeHtml(s.cbp_method)}</div>

          <div class="k" style="margin-top:10px;">Industry Method</div>
          <div class="v">${escapeHtml(s.industry_method)}</div>
        </div>

        <div>
          <div class="kv">
            <div class="k">Application Type</div>
            <div class="v">${escapeHtml(s.application_type)}</div>
          </div>
          <div class="kv" style="margin-top:10px;">
            <div class="k">Application Description</div>
            <div class="desc">${escapeHtml(s.substrate)} • ${escapeHtml(s.tile_type)} • ${escapeHtml(s.description)}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" data-action="docs" data-id="${escapeAttr(s.system_id)}">View Documents</button>
          <button class="btn primary" data-action="download" data-id="${escapeAttr(s.system_id)}">
            Download Now <span class="downloadIcon"></span>
          </button>
        </div>
      </div>
    `;
    els.results.appendChild(card);
  }

  els.results.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const sys = DATA.systems.find(x => x.system_id === id);
      if (!sys) return;

      if (action === "docs") openDocs(sys);
      if (action === "download") downloadPackage(sys);
    });
  });
}

function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll(" ", "%20");
}

function downloadPackage(sys){
  const lines = [];
  lines.push(`CBP Systems Finder - Download Package`);
  lines.push(`System ID: ${sys.system_id}`);
  lines.push(`CBP Method: ${sys.cbp_method}`);
  lines.push(`Industry Method: ${sys.industry_method}`);
  lines.push(`Category: ${sys.category}`);
  lines.push(`Application: ${sys.application_type}`);
  lines.push(`Substrate: ${sys.substrate}`);
  lines.push(`Tile Type: ${sys.tile_type}`);
  lines.push(``);
  lines.push(`Description: ${sys.description}`);
  lines.push(``);
  lines.push(`Products (example mapping):`);
  for (const [role, items] of Object.entries(sys.products || {})){
    lines.push(`- ${role}: ${(items || []).join(", ")}`);
  }
  lines.push(``);
  lines.push(`Documents:`);
  for (const d of (sys.documents || [])){
    lines.push(`- [${d.type}] ${d.title}`);
  }
  lines.push(``);
  lines.push(`NOTE: This demo downloads a text placeholder. Replace with ZIP/PDF bundling later.`);
  downloadText(`${sys.system_id}-package.txt`, lines.join("\n"));
}

function openDocs(sys){
  els.modalTitle.textContent = "Documents";
  els.modalSub.textContent = `${sys.cbp_method} • ${sys.application_type} • ${sys.substrate}`;
  els.modalBody.innerHTML = "";

  for (const d of (sys.documents || [])){
    const row = document.createElement("div");
    row.className = "docRow";
    row.innerHTML = `
      <div class="docMeta">
        <div class="docTitle">${escapeHtml(d.title)}</div>
        <div class="docType">${escapeHtml(d.type)}</div>
      </div>
      <button class="btn ghost" data-open="${escapeAttr(d.url || "#")}">Open</button>
    `;
    els.modalBody.appendChild(row);
  }

  els.modalBody.querySelectorAll("button[data-open]").forEach(b=>{
    b.addEventListener("click", () => {
      const url = b.getAttribute("data-open");
      if (url && url !== "#") window.open(url, "_blank", "noopener,noreferrer");
      else alert("Demo link. Replace '#' with real PDF/DWG URLs.");
    });
  });

  els.modalDownload.onclick = () => downloadPackage(sys);

  els.modalBackdrop.classList.remove("hidden");
}

function closeModal(){
  els.modalBackdrop.classList.add("hidden");
}

function populateOptions(){
  const apps = uniq(DATA.systems.map(s => s.application_type)).sort();
  const subs = uniq(DATA.systems.map(s => s.substrate)).sort();
  const types = uniq(DATA.systems.map(s => s.tile_type)).sort();

  fillSelect(els.application, apps);
  fillSelect(els.substrate, subs);
  fillSelect(els.tileType, types);

  // Apply defaults
  els.application.value = state.application || "";
  els.substrate.value = state.substrate || "";
  els.tileType.value = state.tileType || "";
}

function fillSelect(sel, values){
  const keep = sel.value;
  sel.innerHTML = `<option value="">Any</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  sel.value = keep;
}

function renderCategories(){
  els.catList.innerHTML = "";

  for (const cat of DATA.categories){
    const id = `cat_${cat.replace(/\W+/g,"_")}`;
    const item = document.createElement("label");
    item.className = "radioItem";
    item.htmlFor = id;
    item.innerHTML = `
      <input type="radio" name="category" id="${escapeAttr(id)}" value="${escapeHtml(cat)}" ${cat === state.category ? "checked" : ""} />
      <div>
        <span>${escapeHtml(cat)}</span>
        <div><small>Filter systems by category</small></div>
      </div>
    `;
    els.catList.appendChild(item);
  }

  els.catList.querySelectorAll("input[name=category]").forEach(r=>{
    r.addEventListener("change", () => {
      state.category = r.value;
      render();
    });
  });
}

function resetAll(){
  state = {
    category: "Stone Tile",
    application: "Exterior Floors",
    substrate: "",
    tileType: "",
    query: ""
  };
  els.q.value = "";
  els.application.value = state.application;
  els.substrate.value = "";
  els.tileType.value = "";
  // Set radio
  els.catList.querySelectorAll("input[name=category]").forEach(r=>{
    r.checked = (r.value === state.category);
  });
  render();
}

function wire(){
  els.q.addEventListener("input", () => {
    state.query = els.q.value;
    render();
  });

  els.application.addEventListener("change", () => {
    state.application = els.application.value;
    render();
  });
  els.substrate.addEventListener("change", () => {
    state.substrate = els.substrate.value;
    render();
  });
  els.tileType.addEventListener("change", () => {
    state.tileType = els.tileType.value;
    render();
  });

  els.resetBtn.addEventListener("click", resetAll);
  els.resetSideBtn.addEventListener("click", resetAll);

  els.closeModal.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === els.modalBackdrop) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function render(){
  const list = DATA.systems.filter(systemMatches);

  els.count.textContent = String(list.length);
  if (list.length === 0){
    els.empty.classList.remove("hidden");
  } else {
    els.empty.classList.add("hidden");
  }
  renderCards(list);
}

async function init(){
  const res = await fetch("./data.json", { cache: "no-store" });
  DATA = await res.json();

  renderCategories();
  populateOptions();
  wire();
  render();
}

init().catch(err => {
  console.error(err);
  alert("Failed to load data.json. If running locally, use a simple server (GitHub Pages works great).");
});
