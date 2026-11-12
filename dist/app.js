"use strict";

const icons = {
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Zm0 0v7h7M8 14h8m-8 3h6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4m-3-11a4 4 0 0 1 0 8"/><circle cx="9.5" cy="8" r="4"/>',
  cart:'<path d="M2 3h3l3 12h10l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  box:'<path d="m12 3 9 5v8l-9 5-9-5V8Zm0 9 9-4M12 12 3 8m9 4v9M7.5 5.5l9 5"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  activity:'<path d="M3 12h5l3-7 3 14 3-7h4"/>'
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
const main = document.querySelector("#main");
const dialog = document.querySelector("#dialog");
const key = "ruang-pengadaan-v1";
const money = new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {dateStyle:"medium",timeZone:"Asia/Jakarta"});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"});
const dateKey = (date = new Date()) => dateKeyFormatter.format(date);
const formatDate = date => date ? dateFormatter.format(new Date(date)) : "—";
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[character]);

const labels = {
  draft:"Draf", submitted:"Menunggu Persetujuan", rejected:"Ditolak",
  approved:"Disetujui", sourcing:"Pemilihan Vendor", ordered:"PO Terbit",
  partial:"Diterima Sebagian", received:"Selesai"
};
const pages = {
  ringkasan:"Ringkasan", permintaan:"Permintaan Pembelian", vendor:"Vendor",
  pesanan:"Purchase Order", penerimaan:"Penerimaan"
};
const event = (message, date = new Date().toISOString()) => ({message,date});
const estimate = request => request.items.reduce((sum,item) => sum + item.qty * item.price, 0);
const poTotal = order => order.items.reduce((sum,item) => sum + item.qty * item.price, 0);
const quotedTotal = (request, quote) => request.items.reduce((sum,item,index) => sum + item.qty * quote.prices[index], 0);
const receivedAt = (order, index) => order.receipts.reduce((sum,receipt) => sum + receipt.quantities[index], 0);
const orderStatus = order => order.items.every((item,index) => receivedAt(order,index) === item.qty)
  ? "received" : order.receipts.length ? "partial" : "ordered";
const badge = status => `<span class="status ${status}">${labels[status]}</span>`;

function sampleData() {
  const day = offset => dateKey(new Date(Date.now() + offset * 86400000));
  const vendors = [
    {id:"V-001",name:"PT Sentra Teknik",category:"Peralatan teknis",contact:"Raka",email:"raka@example.com",phone:""},
    {id:"V-002",name:"CV Mitra Kemasan",category:"Kemasan",contact:"Dewi",email:"dewi@example.com",phone:""},
    {id:"V-003",name:"PT Sarana Kantor",category:"Perlengkapan kantor",contact:"Intan",email:"intan@example.com",phone:""}
  ];
  const fixtures = [
    ["Toner printer kantor","Administrasi","Nadia","submitted","Toner hitam",6,435000,-1],
    ["Karton pengiriman","Gudang","Rizky","partial","Karton 40 × 30 cm",100,18000,-2],
    ["Perlengkapan keselamatan","Operasional","Putri","sourcing","Helm keselamatan",20,165000,-3],
    ["Kabel jaringan","IT","Dimas","submitted","Kabel Cat 6 per roll",3,1250000,-4],
    ["Peralatan servis berkala","Maintenance","Arif","ordered","Set kunci servis",4,870000,-5],
    ["Kertas A4","Administrasi","Nadia","received","Kertas A4 80 g per rim",20,55000,-6]
  ];
  const requests = fixtures.map(([title,department,requester,status,name,qty,price,offset],index) => ({
    id:`PR-${String(6 - index).padStart(4,"0")}`, title,department,requester,status,
    need:day(offset + 12),created:day(offset),note:"",items:[{name,qty,price}],
    quotes:status === "sourcing" ? [{id:"Q-001",vendor:"V-001",prices:[155000],lead:4,ref:"QT-112"}] : [],
    history:[event("Permintaan diajukan",day(offset)), ...(status === "submitted" ? [] : [event(labels[status],day(offset+1))])]
  }));
  const orders = [[1,1,40],[4,0,0],[5,2,20]].map(([requestIndex,vendorIndex,quantity],index) => {
    const request = requests[requestIndex];
    return {id:`PO-${String(3-index).padStart(4,"0")}`,request:request.id,vendor:vendors[vendorIndex].id,
      date:day(-1-index),expected:day(4-index),items:request.items,
      receipts:quantity ? [{id:`GR-000${2-index/2}`,date:day(-index),ref:`SJ-10${index+1}`,quantities:[quantity],note:"Barang diperiksa saat diterima."}] : []};
  });
  return {requests,vendors,orders,sequence:{PR:6,V:3,Q:1,PO:3,GR:2},demo:true};
}

let raw = null;
let data = {requests:[],vendors:[],orders:[],sequence:{PR:0,V:0,Q:0,PO:0,GR:0},demo:false};
let storageError = "";
function readData() {
  try {
    const stored = localStorage.getItem(key);
    data = stored ? JSON.parse(stored) : sampleData();
    raw = stored;
    storageError = "";
  } catch {
    storageError = "Data di browser tidak dapat dibaca. Periksa pengaturan penyimpanan browser.";
  }
}
readData();

let toastTimer;
function toast(message) {
  const target = document.querySelector("#toast");
  target.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.textContent = ""; }, 4300);
}
function save(change, message) {
  const formError = dialog.querySelector(".error");
  try {
    if (storageError) throw new Error(storageError);
    if (localStorage.getItem(key) !== raw) {
      readData();
      render();
      dialog.close();
      toast("Data baru saja berubah di tab lain. Buka kembali data untuk melanjutkan.");
      return false;
    }
    const next = structuredClone(data);
    change(next);
    const serialized = JSON.stringify(next);
    localStorage.setItem(key, serialized);
    data = next;
    raw = serialized;
  } catch (error) {
    const message = error.name === "QuotaExceededError" || error.name === "SecurityError"
      ? "Perubahan gagal disimpan. Periksa ruang dan izin penyimpanan browser." : error.message;
    if (formError) formError.textContent = message;
    else toast(message);
    return false;
  }
  dialog.close();
  render();
  toast(message);
  return true;
}
function nextId(state,prefix) {
  state.sequence[prefix] += 1;
  return `${prefix}-${String(state.sequence[prefix]).padStart(prefix === "V" ? 3 : 4,"0")}`;
}
function requireText(form,key,label) {
  const value = String(form.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}
function number(form,key,min,max) {
  const value = Number(requireText(form,key,"Angka"));
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error("Periksa kembali jumlah dan harga yang dimasukkan.");
  return value;
}
const findRequest = id => data.requests.find(request => request.id === id);
const findOrder = id => data.orders.find(order => order.id === id);
const findVendor = id => data.vendors.find(vendor => vendor.id === id);
let page = "";
let filters = {};
let dialogId = "";
let dialogKind = "";

function button(action,label,iconName="",variant="",id="") {
  return `<button type="button" class="button ${variant}" data-action="${action}" data-id="${id}">${iconName ? icon(iconName) : ""}${label}</button>`;
}
function recordButton(action,id,label=id) {
  return `<button type="button" class="record-link" data-action="${action}" data-id="${id}">${escape(label)}</button>`;
}
function table(headers,rows,empty="Belum ada data.", id="") {
  return `<div class="table-scroll"><table><thead><tr>${headers.map(name => `<th scope="col">${name}</th>`).join("")}</tr></thead><tbody ${id ? `id="${id}"` : ""}>${rows || emptyRow(headers.length,empty)}</tbody></table></div>`;
}
const emptyRow = (columns,message) => `<tr><td class="empty" colspan="${columns}">${message}</td></tr>`;
function metric(label,value,iconName,color,route,status="") {
  return `<button class="metric" type="button" data-action="go" data-id="${route}" data-status="${status}"><span class="metric-top"><span class="metric-icon ${color}">${icon(iconName)}</span><span>${icon("arrow")}</span></span><strong>${value}</strong><small>${label}</small></button>`;
}
function step(label,detail,iconName,color,route,status="") {
  return `<button type="button" class="step" data-action="go" data-id="${route}" data-status="${status}"><span class="step-icon ${color}">${icon(iconName)}</span><strong>${label}</strong><small>${detail}</small></button>`;
}
const requestHeaders = ["Nomor PR","Kebutuhan","Departemen","Estimasi","Status",""];
function requestRow(request) {
  return `<tr><td>${recordButton("request",request.id)}</td><td><strong>${escape(request.title)}</strong><small>Butuh ${formatDate(request.need)}</small></td><td>${escape(request.department)}</td><td class="amount">${money.format(estimate(request))}</td><td>${badge(request.status)}</td><td>${recordButton("request",request.id,"Detail")}</td></tr>`;
}
function dashboard() {
  const awaiting = data.requests.filter(request => request.status === "submitted").length;
  const openOrders = data.orders.filter(order => orderStatus(order) !== "received").length;
  return `<section class="hero"><div><div class="eyebrow">${icon("activity")} Operasional pengadaan</div><h1>Ringkasan Pengadaan</h1><p>Pantau pembelian, dari pengajuan kebutuhan hingga barang diterima.</p></div>${button("new-request","Buat Permintaan","plus","light")}</section>
    <section class="section"><div class="section-title"><h2>Status Pengadaan</h2></div><div class="metrics">
    ${metric("Total permintaan",data.requests.length,"file","","permintaan")}
    ${metric("Menunggu persetujuan",awaiting,"clock","amber","permintaan","submitted")}
    ${metric("PO terbuka",openOrders,"cart","blue","pesanan","open")}
    ${metric("Penerimaan selesai",data.orders.length-openOrders,"check","purple","penerimaan","received")}
    </div></section>
    <section class="panel section"><div class="panel-head"><div><h2>Alur Pengadaan</h2><p>Pilih tahap untuk melihat pekerjaan yang terkait.</p></div></div><div class="flow">
    ${step("Permintaan","Catat kebutuhan","file","","permintaan")}
    ${step("Persetujuan","Tinjau permintaan","check","amber","permintaan","submitted")}
    ${step("Pemilihan Vendor","Bandingkan penawaran","users","blue","permintaan","vendor-work")}
    ${step("Purchase Order","Kelola pesanan","cart","purple","pesanan")}
    ${step("Penerimaan","Catat barang masuk","box","","penerimaan")}
    </div></section>
    <section class="panel section"><div class="panel-head"><h2>Permintaan Terbaru</h2><a href="#permintaan" class="text-link">Lihat semua ${icon("arrow")}</a></div>
    ${table(requestHeaders,[...data.requests].reverse().slice(0,5).map(requestRow).join(""),"Belum ada permintaan pembelian.")}</section>
    ${data.demo && raw === null ? `<div class="section-title section"><span>Data contoh tersedia untuk mencoba alur pengadaan.</span>${button("clear-demo","Mulai dengan data kosong","","outline")}</div>` : ""}
    ${raw ? `<div class="section">${button("export-local","Ekspor Data Lokal","","outline")}</div>` : ""}`;
}

const listConfig = {
  permintaan:{description:"Tinjau permintaan dan lanjutkan ke penawaran atau pemesanan.",placeholder:"Cari nomor PR, kebutuhan, atau departemen",action:"new-request",button:"Buat Permintaan",headers:requestHeaders,
    options:[["","Semua status"],["vendor-work","Siap diproses vendor"],...Object.entries(labels)],rows() {
      const statuses = filters.status === "vendor-work" ? ["approved","sourcing"] : [filters.status];
      return [...data.requests].reverse().filter(item => matches(item.id,item.title,item.department,item.requester) && (!filters.status || statuses.includes(item.status))).map(requestRow);
    }},
  vendor:{description:"Simpan kontak pemasok untuk penawaran dan purchase order.",placeholder:"Cari nama, kategori, atau kontak",action:"new-vendor",button:"Tambah Vendor",
    headers:["Kode","Nama vendor","Kategori","Kontak",""],rows() {
      return [...data.vendors].reverse().filter(item => matches(item.id,item.name,item.category,item.contact,item.email)).map(item => `<tr><td>${item.id}</td><td><strong>${escape(item.name)}</strong></td><td>${escape(item.category)}</td><td>${escape(item.contact || "—")}<small>${escape(item.email || item.phone)}</small></td><td>${recordButton("vendor-detail",item.id,"Detail")}</td></tr>`);
    }},
  pesanan:{description:"Lacak pesanan yang sudah diterbitkan dan jadwal pengirimannya.",placeholder:"Cari nomor PO, permintaan, atau vendor",
    headers:["Nomor PO","Permintaan","Vendor","Target tiba","Nilai PO","Status",""],options:[["","Semua status"],["open","PO terbuka"],["received","Selesai"]],rows() {
      return orderList().map(item => `<tr><td>${recordButton("order",item.id)}</td><td>${escape(findRequest(item.request).title)}<small>${item.request}</small></td><td>${escape(findVendor(item.vendor).name)}</td><td>${formatDate(item.expected)}</td><td class="amount">${money.format(poTotal(item))}</td><td>${badge(orderStatus(item))}</td><td>${recordButton("order",item.id,"Detail")}</td></tr>`);
    }},
  penerimaan:{description:"Lihat sisa pesanan dan catat barang yang tiba per item.",placeholder:"Cari nomor PO, permintaan, atau vendor",
    headers:["Nomor PO","Kebutuhan","Diterima","Target tiba","Status",""],options:[["","Semua status"],["open","Belum selesai"],["received","Selesai"]],rows() {
      return orderList().map(item => {
        const total = item.items.reduce((sum,line) => sum + line.qty, 0);
        const received = item.items.reduce((sum,line,index) => sum + receivedAt(item,index), 0);
        return `<tr><td>${recordButton("order",item.id)}</td><td><strong>${escape(findRequest(item.request).title)}</strong><small>${escape(findVendor(item.vendor).name)}</small></td><td>${received} / ${total} unit</td><td>${formatDate(item.expected)}</td><td>${badge(orderStatus(item))}</td><td>${orderStatus(item) === "received" ? recordButton("order",item.id,"Detail") : button("receipt","Catat Penerimaan","plus","outline",item.id)}</td></tr>`;
      });
    }}
};

function matches(...values) {
  const query = (filters.query || "").toLocaleLowerCase("id-ID").trim();
  return values.some(value => value.toLocaleLowerCase("id-ID").includes(query));
}
function orderList() {
  return [...data.orders].reverse().filter(order => {
    const complete = orderStatus(order) === "received";
    return matches(order.id,order.request,findRequest(order.request).title,findVendor(order.vendor).name)
      && (!filters.status || (filters.status === "received" ? complete : !complete));
  });
}
function listPage() {
  const config = listConfig[page];
  return `<div class="page-head"><div><h1 class="h1">${pages[page]}</h1><p>${config.description}</p></div>${config.action ? button(config.action,config.button,"plus") : ""}</div>
  <section class="panel"><div class="toolbar"><label class="search">${icon("search")}<input type="search" aria-label="Cari data" placeholder="${config.placeholder}" value="${escape(filters.query || "")}"></label>
  ${config.options ? `<select aria-label="Filter status" id="status-filter">${config.options.map(([value,label]) => `<option value="${value}" ${value === filters.status ? "selected" : ""}>${label}</option>`).join("")}</select>` : ""}</div>
  ${table(config.headers,config.rows().join(""),"Tidak ada data yang cocok.","results")}</section>`;
}
let nextFilter = null;
function route() {
  const target = location.hash.slice(1);
  page = Object.hasOwn(pages,target) ? target : "ringkasan";
  filters = {query:"",status:nextFilter?.route === page ? nextFilter.status : ""};
  nextFilter = null;
  document.querySelector("#sidebar").classList.remove("open");
  document.querySelector(".mobile-menu").setAttribute("aria-expanded","false");
  render();
  window.scrollTo(0,0);
}
function render() {
  document.querySelector("#crumb").textContent = pages[page];
  document.querySelector("#pending").textContent = data.requests.filter(item => item.status === "submitted").length;
  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav === page) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  }
  main.innerHTML = (storageError ? `<p class="info" role="alert">${escape(storageError)}</p>` : "") + (page === "ringkasan" ? dashboard() : listPage());
}
function renderRows() {
  const config = listConfig[page];
  document.querySelector("#results").innerHTML = config.rows().join("") || emptyRow(config.headers.length,"Tidak ada data yang cocok.");
}

function openDialog(kind,title,body,id="") {
  dialogKind = kind;
  dialogId = id;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" type="button" aria-label="Tutup">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector("form input, form select, [data-action='close']")?.focus();
}
function field(label,name,{type="text",value="",required=true,attributes=""}={}) {
  return `<label>${label}<input class="field" name="${name}" type="${type}" value="${escape(value)}" ${required ? "required" : ""} ${attributes}></label>`;
}
function notes(label,name,value="",required=false) {
  return `<label class="full">${label}<textarea class="field" name="${name}" maxlength="1000" ${required ? "required" : ""}>${escape(value)}</textarea></label>`;
}
function formBody(content,label,extra="") {
  return `<form>${content}<p class="error" role="alert"></p><div class="dialog-actions">${extra}${button("close","Batal","","outline")}<button class="button" type="submit">${label}</button></div></form>`;
}
function lineFields(item={}) {
  return `<div class="form-row">
    ${field("Nama barang","lineName",{value:item.name,attributes:'maxlength="140"'})}
    ${field("Jumlah","qty",{type:"number",value:item.qty,attributes:'min="1" max="100000" step="1"'})}
    ${field("Harga / unit (Rp)","price",{type:"number",value:item.price,attributes:'min="0" max="1000000000" step="1"'})}
    <button class="icon-button" type="button" data-action="remove-line" aria-label="Hapus item">${icon("close")}</button></div>`;
}
function requestForm(request) {
  openDialog("request-form",request ? `Ubah ${request.id}` : "Buat Permintaan",formBody(`
    <div class="form-grid">
      <div class="full">${field("Judul kebutuhan","title",{value:request?.title,attributes:'maxlength="120" placeholder="Misalnya, perlengkapan gudang"'})}</div>
      ${field("Departemen","department",{value:request?.department,attributes:'maxlength="80"'})}
      ${field("Nama pemohon","requester",{value:request?.requester,attributes:'maxlength="80"'})}
      ${field("Tanggal dibutuhkan","need",{type:"date",value:request?.need || dateKey()})}
      ${notes("Catatan (opsional)","note",request?.note)}
    </div>
    <div class="subhead"><h3>Item yang dibutuhkan</h3>${button("add-line","Tambah Item","plus","outline")}</div>
    <div id="lines">${(request?.items || [{}]).map(lineFields).join("")}</div>`,"Simpan Draf"),request?.id);
}
function detail(label,value) {
  return `<div><small>${label}</small><p>${escape(value || "—")}</p></div>`;
}
function detailSection(title,body) {
  return `<div class="subhead"><h3>${title}</h3></div>${body}`;
}
function historyList(request) {
  return detailSection("Riwayat",`<ul class="history">${[...request.history].reverse().map(entry => `<li><strong>${escape(entry.message)}</strong> · ${formatDate(entry.date)}</li>`).join("")}</ul>`);
}
function miniTable(headers,rows) {
  return `<div class="mini-table">${table(headers,rows)}</div>`;
}
function quoteRows(request,actionable) {
  const quotes = [...request.quotes].sort((a,b) => quotedTotal(request,a)-quotedTotal(request,b));
  return quotes.map(quote => `<tr><td><strong>${escape(findVendor(quote.vendor).name)}</strong><small>${escape(quote.ref)}</small></td><td>${money.format(quotedTotal(request,quote))}</td><td>${quote.lead} hari</td><td>${actionable ? button("issue-po","Pilih & Buat PO","","outline",quote.id) : ""}</td></tr>`).join("");
}
function requestDetail(request) {
  const order = data.orders.find(item => item.request === request.id);
  const sourcing = ["approved","sourcing"].includes(request.status);
  const actions = {
    draft:button("edit-request","Ubah Draf","","outline",request.id)+button("submit-request","Ajukan Permintaan","arrow","",request.id),
    rejected:button("reopen","Kembalikan ke Draf","","outline",request.id),
    submitted:button("reject","Tolak","","danger",request.id)+button("approve","Setujui","check","",request.id)
  };
  openDialog("request-detail",`${request.id} · ${escape(request.title)}`,`${badge(request.status)}
    <div class="detail-grid">${detail("Pemohon",request.requester)}${detail("Departemen",request.department)}${detail("Tanggal dibutuhkan",formatDate(request.need))}${detail("Estimasi",money.format(estimate(request)))}${request.note ? detail("Catatan",request.note) : ""}</div>
    ${detailSection("Daftar item",miniTable(["Barang","Jumlah","Harga / unit"],request.items.map(item => `<tr><td>${escape(item.name)}</td><td>${item.qty}</td><td>${money.format(item.price)}</td></tr>`).join("")))}
    ${sourcing || request.quotes.length ? `<div class="subhead"><h3>Penawaran Vendor</h3>${sourcing ? button("new-quote","Tambah Penawaran","plus","outline",request.id) : ""}</div>${request.quotes.length ? miniTable(["Vendor","Total","Estimasi tiba",""],quoteRows(request,sourcing)) : '<p class="info">Tambahkan penawaran untuk membandingkan harga dan waktu pengiriman sebelum menerbitkan PO.</p>'}` : ""}
    ${historyList(request)}
    <div class="dialog-actions">${order ? button("order",`Lihat ${order.id}`,"arrow","outline",order.id) : actions[request.status] || ""}</div>`,request.id);
}
function vendorForm(vendor) {
  openDialog("vendor-form",vendor ? "Ubah Vendor" : "Tambah Vendor",formBody(`<div class="form-grid">
    ${field("Nama vendor","name",{value:vendor?.name,attributes:'maxlength="120"'})}
    ${field("Kategori","category",{value:vendor?.category,attributes:'maxlength="80"'})}
    ${field("Nama kontak (opsional)","contact",{value:vendor?.contact,required:false,attributes:'maxlength="80"'})}
    ${field("Email (opsional)","email",{type:"email",value:vendor?.email,required:false,attributes:'maxlength="140"'})}
    ${field("Telepon (opsional)","phone",{type:"tel",value:vendor?.phone,required:false,attributes:'maxlength="40"'})}
  </div>`,"Simpan Vendor"),vendor?.id);
}
function vendorDetail(vendor) {
  openDialog("vendor-detail",escape(vendor.name),`<div class="detail-grid">${detail("Kode vendor",vendor.id)}${detail("Kategori",vendor.category)}${detail("Nama kontak",vendor.contact)}${detail("Email",vendor.email)}${detail("Telepon",vendor.phone)}</div><div class="dialog-actions">${button("edit-vendor","Ubah Vendor","","outline",vendor.id)}</div>`,vendor.id);
}
function quoteForm(request) {
  if (!data.vendors.length) {
    openDialog("quote-empty","Tambah Penawaran",`<p class="info">Tambahkan vendor terlebih dahulu agar penawaran dapat dihubungkan ke pemasok.</p><div class="dialog-actions">${button("vendor-from-quote","Tambah Vendor","plus","",request.id)}</div>`,request.id);
    return;
  }
  const options = data.vendors.map(vendor => `<option value="${vendor.id}">${escape(vendor.name)}</option>`).join("");
  openDialog("quote-form","Tambah Penawaran",formBody(`<div class="form-grid">
    <label>Vendor<select name="vendor" required><option value="">Pilih vendor</option>${options}</select></label>
    ${field("Nomor referensi (opsional)","ref",{required:false,attributes:'maxlength="80"'})}
    ${field("Estimasi pengiriman (hari)","lead",{type:"number",attributes:'min="0" max="3650" step="1"'})}
    </div><div class="subhead"><h3>Harga penawaran per unit</h3></div><div class="form-grid">
    ${request.items.map((item,index) => field(`${escape(item.name)} · ${item.qty} unit`,`price${index}`,{type:"number",attributes:'min="0" max="1000000000" step="1"'})).join("")}</div>`,"Simpan Penawaran"),request.id);
}
function poForm(request,quote) {
  const expected = dateKey(new Date(Date.now() + quote.lead * 86400000));
  openDialog("po-form","Terbitkan Purchase Order",formBody(`<div class="detail-grid">${detail("Permintaan",request.id)}${detail("Vendor",findVendor(quote.vendor).name)}${detail("Nilai PO",money.format(quotedTotal(request,quote)))}</div>
  <input name="quote" type="hidden" value="${quote.id}">
  ${field("Target barang tiba","expected",{type:"date",value:expected,attributes:`min="${dateKey()}"`})}`,"Terbitkan PO"),request.id);
}
function orderDetail(order) {
  const request = findRequest(order.request);
  const status = orderStatus(order);
  const rows = order.items.map((item,index) => `<tr><td>${escape(item.name)}</td><td>${item.qty}</td><td>${money.format(item.price)}</td><td>${receivedAt(order,index)}</td><td>${item.qty-receivedAt(order,index)}</td></tr>`).join("");
  const receipts = [...order.receipts].reverse().map(receipt => {
    const summary = order.items.map((item,index) => receipt.quantities[index] ? `${receipt.quantities[index]} × ${item.name}` : "").filter(Boolean).join(", ");
    return `<tr><td><strong>${receipt.id}</strong><small>${formatDate(receipt.date)}</small></td><td>${escape(receipt.ref)}<small>${escape(receipt.note)}</small></td><td>${escape(summary)}</td></tr>`;
  }).join("");
  openDialog("order-detail",order.id,`${badge(status)}<div class="detail-grid">
  ${detail("Permintaan",`${request.id} · ${request.title}`)}${detail("Vendor",findVendor(order.vendor).name)}
  ${detail("Tanggal terbit",formatDate(order.date))}${detail("Target tiba",formatDate(order.expected))}
  ${detail("Nilai pesanan",money.format(poTotal(order)))}
  </div>${detailSection("Rincian pesanan",miniTable(["Barang","Dipesan","Harga / unit","Diterima","Sisa"],rows))}
  ${detailSection("Riwayat penerimaan",receipts ? miniTable(["Penerimaan","Surat jalan","Barang diterima"],receipts) : '<p class="info">Belum ada penerimaan untuk PO ini.</p>')}
  <div class="dialog-actions">${button("request","Lihat Permintaan","","outline",request.id)}${status === "received" ? "" : button("receipt","Catat Penerimaan","plus","",order.id)}</div>`,order.id);
}
function receiptForm(order) {
  openDialog("receipt-form",`Catat Penerimaan · ${order.id}`,formBody(`<div class="form-grid">
    ${field("Tanggal diterima","date",{type:"date",value:dateKey(),attributes:`min="${order.date}" max="${dateKey()}"`})}
    ${field("Nomor surat jalan","ref",{attributes:'maxlength="100"'})}
    ${notes("Catatan pemeriksaan (opsional)","note")}</div>
    <div class="subhead"><h3>Jumlah yang diterima</h3></div><div class="form-grid">
    ${order.items.map((item,index) => {
      const remaining = item.qty-receivedAt(order,index);
      return field(`${escape(item.name)} · sisa ${remaining}`,`qty${index}`,{type:"number",value:0,attributes:`min="0" max="${remaining}" step="1"`});
    }).join("")}</div>`,"Simpan Penerimaan"),order.id);
}

function transition(request,status,message) {
  request.status = status;
  request.history.push(event(message));
}
const requestIn = (state,id) => state.requests.find(item => item.id === id);
function changeStatus(id,status,message) {
  if (save(state => transition(requestIn(state,id),status,message),message)) requestDetail(findRequest(id));
}
function confirmAction(kind,title,message,label,id="") {
  openDialog(kind,title,formBody(`<p class="info">${message}</p>`,label),id);
}
let resumeQuote = "";
let savedRecord = "";
const submissions = {
  "request-form"(state,form,id) {
    const lines = form.getAll("lineName");
    if (!lines.length || lines.length > 25) throw new Error("Permintaan harus berisi 1 hingga 25 item.");
    const quantities = form.getAll("qty");
    const prices = form.getAll("price");
    const items = lines.map((line,index) => {
      const values = new Map([["qty",quantities[index]],["price",prices[index]]]);
      if (!line.trim()) throw new Error("Nama barang wajib diisi.");
      return {name:line.trim(),qty:number(values,"qty",1,100000),price:number(values,"price",0,1000000000)};
    });
    const request = id ? requestIn(state,id) : {id:nextId(state,"PR"),status:"draft",created:dateKey(),quotes:[],history:[]};
    Object.assign(request,{title:requireText(form,"title","Judul kebutuhan"),department:requireText(form,"department","Departemen"),requester:requireText(form,"requester","Nama pemohon"),need:requireText(form,"need","Tanggal dibutuhkan"),note:form.get("note").trim(),items});
    request.history.push(event(id ? "Draf diperbarui" : "Draf dibuat"));
    if (!id) state.requests.push(request);
    savedRecord = request.id;
  },
  "vendor-form"(state,form,id) {
    const name = requireText(form,"name","Nama vendor");
    if (state.vendors.some(vendor => vendor.id !== id && vendor.name.toLowerCase() === name.toLowerCase())) throw new Error("Nama vendor sudah terdaftar.");
    const vendor = {id:id || nextId(state,"V"),name,category:requireText(form,"category","Kategori"),contact:form.get("contact").trim(),email:form.get("email").trim(),phone:form.get("phone").trim()};
    if (id) Object.assign(state.vendors.find(item => item.id === id),vendor);
    else state.vendors.push(vendor);
    savedRecord = vendor.id;
  },
  "quote-form"(state,form,id) {
    const request = requestIn(state,id);
    const vendor = requireText(form,"vendor","Vendor");
    if (!state.vendors.some(item => item.id === vendor)) throw new Error("Pilih vendor yang terdaftar.");
    request.quotes.push({id:nextId(state,"Q"),vendor,ref:form.get("ref").trim(),lead:number(form,"lead",0,3650),prices:request.items.map((_,index) => number(form,`price${index}`,0,1000000000))});
    transition(request,"sourcing","Penawaran vendor dicatat");
  },
  "po-form"(state,form,id) {
    const request = requestIn(state,id);
    if (state.orders.some(order => order.request === id)) throw new Error("Permintaan ini sudah memiliki PO.");
    const quote = request.quotes.find(item => item.id === form.get("quote"));
    if (!quote) throw new Error("Pilih penawaran yang tersedia.");
    const order = {id:nextId(state,"PO"),request:id,vendor:quote.vendor,date:dateKey(),expected:requireText(form,"expected","Target tiba"),items:request.items.map((item,index) => ({...item,price:quote.prices[index]})),receipts:[]};
    state.orders.push(order);
    transition(request,"ordered",`${order.id} diterbitkan`);
    savedRecord = order.id;
  },
  "receipt-form"(state,form,id) {
    const order = state.orders.find(item => item.id === id);
    const quantities = order.items.map((item,index) => number(form,`qty${index}`,0,item.qty-receivedAt(order,index)));
    if (quantities.every(quantity => quantity === 0)) throw new Error("Masukkan jumlah diterima untuk minimal satu item.");
    const ref = requireText(form,"ref","Nomor surat jalan");
    if (order.receipts.some(receipt => receipt.ref.toLowerCase() === ref.toLowerCase())) throw new Error("Surat jalan ini sudah dicatat untuk PO tersebut.");
    const receipt = {id:nextId(state,"GR"),date:requireText(form,"date","Tanggal diterima"),ref,quantities,note:form.get("note").trim()};
    order.receipts.push(receipt);
    transition(requestIn(state,order.request),orderStatus(order),`Penerimaan ${receipt.id} dicatat`);
  },
  reject(state,form,id) {
    transition(requestIn(state,id),"rejected",`Ditolak · ${requireText(form,"reason","Alasan penolakan")}`);
  },
  approve(state,form,id) {
    transition(requestIn(state,id),"approved","Permintaan disetujui");
  },
  "clear-demo"(state) {
    state.requests = [];
    state.vendors = [];
    state.orders = [];
    state.sequence = {PR:0,V:0,Q:0,PO:0,GR:0};
    state.demo = false;
  }
};
const messages = {
  "request-form":"Draf permintaan disimpan.", "vendor-form":"Vendor disimpan.",
  "quote-form":"Penawaran dicatat.", "po-form":"Purchase order diterbitkan.",
  "receipt-form":"Penerimaan dicatat.", reject:"Penolakan dicatat.",
  approve:"Permintaan disetujui.", "clear-demo":"Data contoh dihapus."
};

dialog.addEventListener("submit",event => {
  event.preventDefault();
  const kind = dialogKind;
  const id = dialogId;
  const form = new FormData(event.target);
  savedRecord = "";
  if (!save(state => submissions[kind](state,form,id),messages[kind])) return;
  if (kind === "request-form") requestDetail(findRequest(savedRecord));
  if (kind === "vendor-form" && resumeQuote) {
    const request = findRequest(resumeQuote);
    resumeQuote = "";
    quoteForm(request);
  } else if (kind === "vendor-form") vendorDetail(findVendor(savedRecord));
  if (["quote-form","reject","approve"].includes(kind)) requestDetail(findRequest(id));
  if (kind === "po-form") orderDetail(findOrder(savedRecord));
  if (kind === "receipt-form") orderDetail(findOrder(id));
});
dialog.addEventListener("close",() => {
  if (!dialog.open) resumeQuote = "";
});

const actions = {
  "export-local"() {
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ruang-pengadaan-cadangan.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  menu() {
    const sidebar = document.querySelector("#sidebar");
    const opened = sidebar.classList.toggle("open");
    document.querySelector(".mobile-menu").setAttribute("aria-expanded",opened);
    if (opened) sidebar.querySelector("[aria-current='page']")?.focus();
  },
  close() { dialog.close(); },
  go(id,element) {
    const status = element.dataset.status;
    if (page === id) {
      filters = {query:"",status};
      render();
      return;
    }
    nextFilter = {route:id,status};
    location.hash = id;
  },
  "new-request"() { requestForm(); },
  request(id) { requestDetail(findRequest(id)); },
  "edit-request"(id) { requestForm(findRequest(id)); },
  "add-line"() {
    const lines = dialog.querySelector("#lines");
    if (lines.children.length >= 25) {
      dialog.querySelector(".error").textContent = "Maksimal 25 item per permintaan.";
      return;
    }
    lines.insertAdjacentHTML("beforeend",lineFields());
    lines.lastElementChild.querySelector("input").focus();
  },
  "remove-line"(id,element) {
    const lines = dialog.querySelector("#lines");
    if (lines.children.length > 1) element.closest(".form-row").remove();
    else dialog.querySelector(".error").textContent = "Sisakan minimal satu item.";
  },
  "submit-request"(id) { changeStatus(id,"submitted","Permintaan diajukan"); },
  reopen(id) { changeStatus(id,"draft","Permintaan dikembalikan ke draf"); },
  approve(id) {
    confirmAction("approve","Setujui Permintaan","Setujui kebutuhan ini untuk melanjutkan ke pemilihan vendor.","Setujui Permintaan",id);
  },
  reject(id) {
    openDialog("reject","Tolak Permintaan",formBody(notes("Alasan penolakan","reason","",true),"Tolak Permintaan"),id);
  },
  "new-vendor"() { vendorForm(); },
  "vendor-detail"(id) { vendorDetail(findVendor(id)); },
  "edit-vendor"(id) { vendorForm(findVendor(id)); },
  "vendor-from-quote"(id) { resumeQuote = id; vendorForm(); },
  "new-quote"(id) { quoteForm(findRequest(id)); },
  "issue-po"(id) {
    const request = findRequest(dialogId);
    poForm(request,request.quotes.find(quote => quote.id === id));
  },
  order(id) { orderDetail(findOrder(id)); },
  receipt(id) { receiptForm(findOrder(id)); },
  "clear-demo"() {
    confirmAction("clear-demo","Mulai dengan data kosong","Permintaan, vendor, dan pesanan contoh akan dihapus dari browser ini.","Hapus Data Contoh");
  }
};
document.addEventListener("click",event => {
  const element = event.target.closest("[data-action]");
  if (element) actions[element.dataset.action]?.(element.dataset.id,element);
  const sidebar = document.querySelector("#sidebar");
  if (sidebar.classList.contains("open") && !event.target.closest(".sidebar,.mobile-menu")) {
    sidebar.classList.remove("open");
    document.querySelector(".mobile-menu").setAttribute("aria-expanded","false");
  }
});
main.addEventListener("input",event => {
  if (event.target.type !== "search") return;
  filters.query = event.target.value;
  renderRows();
});
main.addEventListener("change",event => {
  if (event.target.id !== "status-filter") return;
  filters.status = event.target.value;
  renderRows();
});
window.addEventListener("hashchange",route);
window.addEventListener("storage",event => {
  if (event.key !== key && event.key !== null) return;
  readData();
  render();
  if (dialog.open) {
    dialog.close();
    toast("Data diperbarui dari tab lain.");
  }
});
for (const target of document.querySelectorAll("[data-icon]")) target.innerHTML = icon(target.dataset.icon);
document.querySelector("#today").textContent = new Intl.DateTimeFormat("id-ID",{
  weekday:"long",year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Jakarta"
}).format(new Date());
route();
