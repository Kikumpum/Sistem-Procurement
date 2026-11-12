const money = new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {dateStyle:"medium",timeZone:"Asia/Jakarta"});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"});
const dateKey = (date = new Date()) => dateKeyFormatter.format(date);
const formatDate = date => date ? dateFormatter.format(new Date(date)) : "—";
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
function transition(request,status,message) {
  request.status = status;
  request.history.push(event(message));
}
const requestIn = (state,id) => state.requests.find(item => item.id === id);
const submissions = {
  submit(state, form, id) {
    transition(requestIn(state,id),"submitted","Permintaan diajukan");
  },
  reopen(state, form, id) {
    transition(requestIn(state,id),"draft","Permintaan dikembalikan ke draf");
  },
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
    return request.id;
  },
  "vendor-form"(state,form,id) {
    const name = requireText(form,"name","Nama vendor");
    if (state.vendors.some(vendor => vendor.id !== id && vendor.name.toLowerCase() === name.toLowerCase())) throw new Error("Nama vendor sudah terdaftar.");
    const vendor = {id:id || nextId(state,"V"),name,category:requireText(form,"category","Kategori"),contact:form.get("contact").trim(),email:form.get("email").trim(),phone:form.get("phone").trim()};
    if (id) Object.assign(state.vendors.find(item => item.id === id),vendor);
    else state.vendors.push(vendor);
    return vendor.id;
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
    return order.id;
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
};
export const emptyWorkspace = () => ({requests:[],vendors:[],orders:[],sequence:{PR:0,V:0,Q:0,PO:0,GR:0}});
export {money,dateKey,formatDate,labels,pages,estimate,poTotal,quotedTotal,receivedAt,orderStatus,submissions};
