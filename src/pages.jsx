import { useState } from "react";
import { Button, Icon, Status, Table } from "./ui.jsx";
import { labels, pages, estimate, poTotal, receivedAt, orderStatus, money, formatDate } from "./workflow.js";

const requestHeaders = ["Nomor PR", "Kebutuhan", "Departemen", "Estimasi", "Status", ""];
const descriptions = {
  permintaan: "Tinjau permintaan dan lanjutkan ke penawaran atau pemesanan.",
  vendor: "Simpan kontak pemasok untuk penawaran dan purchase order.",
  pesanan: "Lacak pesanan yang sudah diterbitkan dan jadwal pengirimannya.",
  penerimaan: "Lihat sisa pesanan dan catat barang yang tiba per item."
};

function RecordLink({ open, kind, id, children = id }) {
  return <button type="button" className="record-link" onClick={() => open(kind, id)}>{children}</button>;
}

function requestRows(requests, open) {
  return requests.map(request => <tr key={request.id}>
    <td><RecordLink open={open} kind="request" id={request.id} /></td>
    <td><strong>{request.title}</strong><small>Butuh {formatDate(request.need)}</small></td>
    <td>{request.department}</td><td className="amount">{money.format(estimate(request))}</td>
    <td><Status status={request.status} /></td>
    <td><RecordLink open={open} kind="request" id={request.id}>Detail</RecordLink></td>
  </tr>);
}

const steps = [
  ["Permintaan", "Catat kebutuhan", "file", "", "permintaan", ""],
  ["Persetujuan", "Tinjau permintaan", "check", "amber", "permintaan", "submitted"],
  ["Pemilihan Vendor", "Bandingkan penawaran", "users", "blue", "permintaan", "vendor-work"],
  ["Purchase Order", "Kelola pesanan", "cart", "purple", "pesanan", ""],
  ["Penerimaan", "Catat barang masuk", "box", "", "penerimaan", ""]
];

export function Dashboard({ data, go, open, canImport }) {
  const awaiting = data.requests.filter(request => request.status === "submitted").length;
  const completed = data.orders.filter(order => orderStatus(order) === "received").length;
  const metrics = [
    ["Total permintaan", data.requests.length, "file", "", "permintaan", ""],
    ["Menunggu persetujuan", awaiting, "clock", "amber", "permintaan", "submitted"],
    ["PO terbuka", data.orders.length - completed, "cart", "blue", "pesanan", "open"],
    ["Penerimaan selesai", completed, "check", "purple", "penerimaan", "received"]
  ];
  return <>
    <div className="page-head">
      <h1 className="h1">Ringkasan Pengadaan</h1>
      <Button icon="plus" onClick={() => open("request-form")}>Buat Permintaan</Button>
    </div>
    <section aria-label="Status pengadaan">
      <div className="metrics">{metrics.map(([label, count, icon, color, page, status]) =>
        <button className="metric" type="button" key={label} onClick={() => go(page, status)}>
          <span className="metric-top"><small>{label}</small><span className={"metric-icon " + color}><Icon name={icon} /></span></span>
          <strong>{count}</strong>
        </button>)}</div>
    </section>
    <section className="panel section"><div className="panel-head"><h2>Alur Pengadaan</h2></div>
      <div className="flow">{steps.map(([label, detail, icon, color, page, status]) =>
        <button className="step" type="button" key={label} onClick={() => go(page, status)}>
          <span className={"step-icon " + color}><Icon name={icon} /></span><strong>{label}</strong><small>{detail}</small>
        </button>)}</div>
    </section>
    <section className="panel section">
      <div className="panel-head"><h2>Permintaan Terbaru</h2><a href="#permintaan" className="text-link" onClick={event => {
        event.preventDefault();
        go("permintaan");
      }}>Lihat semua <Icon name="arrow" /></a></div>
      <Table headers={requestHeaders} rows={requestRows([...data.requests].reverse().slice(0, 5), open)} />
    </section>
    {canImport && <div className="section"><Button variant="outline" onClick={() => open("import")}>Impor Data Versi Lama</Button></div>}
  </>;
}

function orderRows({ data, open, page, matches, status }) {
  const requests = new Map(data.requests.map(item => [item.id, item]));
  const vendors = new Map(data.vendors.map(item => [item.id, item]));
  return [...data.orders].reverse().flatMap(order => {
    const request = requests.get(order.request);
    const vendor = vendors.get(order.vendor);
    const state = orderStatus(order);
    if (!matches(order.id, request.title, request.id, vendor.name)) return [];
    if (status === "open" && state === "received" || status === "received" && state !== "received") return [];
    const total = order.items.reduce((sum, item) => sum + item.qty, 0);
    const received = order.items.reduce((sum, _, index) => sum + receivedAt(order, index), 0);
    return [<tr key={order.id}>
      <td><RecordLink open={open} kind="order" id={order.id} /></td>
      {page === "penerimaan" ? <>
        <td><strong>{request.title}</strong><small>{vendor.name}</small></td>
        <td>{received} / {total} unit</td><td>{formatDate(order.expected)}</td>
      </> : <>
        <td><strong>{request.title}</strong><small>{request.id}</small></td><td>{vendor.name}</td>
        <td>{formatDate(order.expected)}</td><td className="amount">{money.format(poTotal(order))}</td>
      </>}
      <td><Status status={state} /></td><td>
        {page === "penerimaan" && state !== "received"
          ? <Button icon="plus" variant="outline" onClick={() => open("receipt-form", order.id)}>Catat Penerimaan</Button>
          : <RecordLink open={open} kind="order" id={order.id}>Detail</RecordLink>}
      </td>
    </tr>];
  });
}

export function WorkList({ page, initialStatus, data, open }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const matches = (...values) => values.some(value => value.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
  let headers;
  let rows;
  let options;
  if (page === "permintaan") {
    headers = requestHeaders;
    options = [["vendor-work", "Siap diproses vendor"], ...Object.entries(labels)];
    const statuses = status === "vendor-work" ? ["approved", "sourcing"] : [status];
    rows = requestRows([...data.requests].reverse().filter(item =>
      matches(item.id, item.title, item.department, item.requester) && (!status || statuses.includes(item.status))), open);
  } else if (page === "vendor") {
    headers = ["Kode", "Nama vendor", "Kategori", "Kontak", ""];
    rows = [...data.vendors].reverse().filter(item => matches(item.id, item.name, item.category, item.contact, item.email)).map(item =>
      <tr key={item.id}><td>{item.id}</td><td><strong>{item.name}</strong></td><td>{item.category}</td>
        <td>{item.contact || "—"}<small>{item.email || item.phone}</small></td>
        <td><RecordLink open={open} kind="vendor" id={item.id}>Detail</RecordLink></td></tr>);
  } else {
    headers = page === "pesanan"
      ? ["Nomor PO", "Permintaan", "Vendor", "Target tiba", "Nilai PO", "Status", ""]
      : ["Nomor PO", "Kebutuhan", "Diterima", "Target tiba", "Status", ""];
    options = [["open", "Belum selesai"], ["received", "Selesai"]];
    rows = orderRows({ data, open, page, matches, status });
  }

  return <>
    <div className="page-head"><div><h1 className="h1">{pages[page]}</h1><p>{descriptions[page]}</p></div>
      {page === "permintaan" && <Button icon="plus" onClick={() => open("request-form")}>Buat Permintaan</Button>}
      {page === "vendor" && <Button icon="plus" onClick={() => open("vendor-form")}>Tambah Vendor</Button>}
    </div>
    <section className="panel"><div className="toolbar">
      <label className="search"><Icon name="search" /><input type="search" aria-label="Cari data"
        placeholder="Cari data" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {options && <select aria-label="Filter status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">Semua status</option>
        {options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>}
    </div><Table headers={headers} rows={rows} empty="Tidak ada data yang cocok." /></section>
  </>;
}
