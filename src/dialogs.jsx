import { useRef, useState } from "react";
import { Button, Detail, Field, Icon, Modal, Notes, Status, Table } from "./ui.jsx";
import { dateKey, formatDate, money, estimate, poTotal, quotedTotal, receivedAt, orderStatus } from "./workflow.js";

const prices = { min: 0, max: 1000000000, step: 1 };
const itemsTable = (headers, rows) => <div className="mini-table"><Table headers={headers} rows={rows} /></div>;

function RequestFields({ request }) {
  const ids = useRef(request?.items.length ?? 1);
  const [lines, setLines] = useState(() => (request?.items ?? [{}]).map((item, key) => ({ ...item, key })));
  return <>
    <div className="form-grid">
      <div className="full"><Field label="Judul kebutuhan" name="title" value={request?.title} maxLength={120} /></div>
      <Field label="Departemen" name="department" value={request?.department} maxLength={80} />
      <Field label="Nama pemohon" name="requester" value={request?.requester} maxLength={80} />
      <Field label="Tanggal dibutuhkan" name="need" type="date" value={request?.need ?? dateKey()} />
      <Notes label="Catatan (opsional)" value={request?.note} />
    </div>
    <div className="subhead"><h3>Item yang dibutuhkan</h3>
      <Button variant="outline" icon="plus" disabled={lines.length >= 25} onClick={() => {
        const key = ids.current++;
        setLines(current => [...current, { key }]);
      }}>Tambah Item</Button>
    </div>
    {lines.map(item => <div className="form-row" key={item.key}>
      <Field label="Nama barang" name="lineName" value={item.name} maxLength={140} />
      <Field label="Jumlah" name="qty" type="number" value={item.qty} min={1} max={100000} step={1} />
      <Field label="Harga / unit (Rp)" name="price" type="number" value={item.price} {...prices} />
      <button className="icon-button" type="button" aria-label="Hapus item" disabled={lines.length <= 1}
        onClick={() => setLines(lines.filter(line => line.key !== item.key))}><Icon name="close" /></button>
    </div>)}
  </>;
}

function VendorFields({ vendor }) {
  return <div className="form-grid">
    <Field label="Nama vendor" name="name" value={vendor?.name} maxLength={120} />
    <Field label="Kategori" name="category" value={vendor?.category} maxLength={80} />
    <Field label="Nama kontak (opsional)" name="contact" value={vendor?.contact} required={false} maxLength={80} />
    <Field label="Email (opsional)" name="email" type="email" value={vendor?.email} required={false} maxLength={140} />
    <Field label="Telepon (opsional)" name="phone" type="tel" value={vendor?.phone} required={false} maxLength={40} />
  </div>;
}

function RequestDetails({ request, data, open }) {
  const sourcing = ["approved", "sourcing"].includes(request.status);
  const order = data.orders.find(item => item.request === request.id);
  const sorted = [...request.quotes].sort((a, b) => quotedTotal(request, a) - quotedTotal(request, b));
  const actions = {
    draft: <><Button variant="outline" onClick={() => open("request-form", request.id)}>Ubah Draf</Button>
      <Button icon="arrow" onClick={() => open("submit", request.id)}>Ajukan Permintaan</Button></>,
    submitted: <><Button variant="danger" onClick={() => open("reject", request.id)}>Tolak</Button>
      <Button icon="check" onClick={() => open("approve", request.id)}>Setujui</Button></>,
    rejected: <Button variant="outline" onClick={() => open("reopen", request.id)}>Kembalikan ke Draf</Button>
  };
  return <>
    <Status status={request.status} />
    <div className="detail-grid">
      <Detail label="Pemohon">{request.requester}</Detail><Detail label="Departemen">{request.department}</Detail>
      <Detail label="Tanggal dibutuhkan">{formatDate(request.need)}</Detail><Detail label="Estimasi">{money.format(estimate(request))}</Detail>
      {request.note && <Detail label="Catatan">{request.note}</Detail>}
    </div>
    <div className="subhead"><h3>Daftar Item</h3></div>
    {itemsTable(["Barang", "Jumlah", "Harga / unit"], request.items.map((item, index) =>
      <tr key={index}><td>{item.name}</td><td>{item.qty}</td><td>{money.format(item.price)}</td></tr>))}
    {(sourcing || sorted.length > 0) && <>
      <div className="subhead"><h3>Penawaran Vendor</h3>
        {sourcing && <Button icon="plus" variant="outline" onClick={() => open("quote-form", request.id)}>Tambah Penawaran</Button>}
      </div>
      {sorted.length ? itemsTable(["Vendor", "Total", "Estimasi tiba", ""], sorted.map(quote =>
        <tr key={quote.id}><td><strong>{data.vendors.find(item => item.id === quote.vendor)?.name}</strong><small>{quote.ref}</small></td>
          <td>{money.format(quotedTotal(request, quote))}</td><td>{quote.lead} hari</td>
          <td>{sourcing && <Button variant="outline" onClick={() => open("po-form", request.id, quote.id)}>Pilih &amp; Buat PO</Button>}</td></tr>))
        : <p className="info">Tambahkan penawaran untuk membandingkan harga dan waktu pengiriman.</p>}
    </>}
    <div className="subhead"><h3>Riwayat</h3></div>
    <ul className="history">{[...request.history].reverse().map((entry, index) =>
      <li key={index}><strong>{entry.message}</strong> · {formatDate(entry.date)}</li>)}</ul>
    <div className="dialog-actions">{order
      ? <Button icon="arrow" variant="outline" onClick={() => open("order", order.id)}>Lihat {order.id}</Button>
      : actions[request.status]}</div>
  </>;
}

function OrderDetails({ order, data, open }) {
  const request = data.requests.find(item => item.id === order.request);
  const vendor = data.vendors.find(item => item.id === order.vendor);
  const state = orderStatus(order);
  return <>
    <Status status={state} />
    <div className="detail-grid">
      <Detail label="Permintaan">{request.id} · {request.title}</Detail><Detail label="Vendor">{vendor.name}</Detail>
      <Detail label="Tanggal terbit">{formatDate(order.date)}</Detail><Detail label="Target tiba">{formatDate(order.expected)}</Detail>
      <Detail label="Nilai pesanan">{money.format(poTotal(order))}</Detail>
    </div>
    <div className="subhead"><h3>Rincian Pesanan</h3></div>
    {itemsTable(["Barang", "Dipesan", "Harga / unit", "Diterima", "Sisa"], order.items.map((item, index) =>
      <tr key={index}><td>{item.name}</td><td>{item.qty}</td><td>{money.format(item.price)}</td>
        <td>{receivedAt(order, index)}</td><td>{item.qty - receivedAt(order, index)}</td></tr>))}
    <div className="subhead"><h3>Riwayat Penerimaan</h3></div>
    {order.receipts.length ? itemsTable(["Penerimaan", "Surat jalan", "Barang diterima"], [...order.receipts].reverse().map(receipt =>
      <tr key={receipt.id}><td><strong>{receipt.id}</strong><small>{formatDate(receipt.date)}</small></td>
        <td>{receipt.ref}<small>{receipt.note}</small></td><td>{order.items.map((item, index) =>
          receipt.quantities[index] ? receipt.quantities[index] + " × " + item.name : "").filter(Boolean).join(", ")}</td></tr>))
      : <p className="info">Belum ada penerimaan untuk PO ini.</p>}
    <div className="dialog-actions">
      <Button variant="outline" onClick={() => open("request", request.id)}>Lihat Permintaan</Button>
      {state !== "received" && <Button icon="plus" onClick={() => open("receipt-form", order.id)}>Catat Penerimaan</Button>}
    </div>
  </>;
}

function QuoteFields({ request, vendors }) {
  return <>
    <div className="form-grid">
      <label>Vendor<select name="vendor" required><option value="">Pilih vendor</option>
        {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
      </select></label>
      <Field label="Nomor referensi (opsional)" name="ref" required={false} maxLength={80} />
      <Field label="Estimasi pengiriman (hari)" name="lead" type="number" min={0} max={3650} step={1} />
    </div>
    <div className="subhead"><h3>Harga Penawaran per Unit</h3></div>
    <div className="form-grid">{request.items.map((item, index) =>
      <Field key={index} label={item.name + " · " + item.qty + " unit"} name={"price" + index} type="number" {...prices} />)}</div>
  </>;
}

const confirmations = {
  submit: ["Ajukan Permintaan", "Ajukan kebutuhan ini untuk ditinjau."],
  reopen: ["Kembalikan ke Draf", "Buka kembali draf untuk memperbaiki permintaan."],
  approve: ["Setujui Permintaan", "Setujui kebutuhan ini untuk melanjutkan ke pemilihan vendor."]
};

export function WorkflowDialog({ view, data, open, close, busy, error, submit }) {
  const { kind, id, extra } = view;
  const request = data.requests.find(item => item.id === id);
  const order = data.orders.find(item => item.id === id);
  const vendor = data.vendors.find(item => item.id === id);
  let title;
  let content;
  let submitLabel;

  switch (kind) {
    case "request":
      title = request.id + " · " + request.title;
      content = <RequestDetails request={request} data={data} open={open} />;
      break;
    case "request-form":
      title = request ? "Ubah " + request.id : "Buat Permintaan";
      submitLabel = "Simpan Draf";
      content = <RequestFields request={request} />;
      break;
    case "vendor":
      title = vendor.name;
      content = <>
        <div className="detail-grid"><Detail label="Kode vendor">{vendor.id}</Detail><Detail label="Kategori">{vendor.category}</Detail>
          <Detail label="Kontak">{vendor.contact}</Detail><Detail label="Email">{vendor.email}</Detail><Detail label="Telepon">{vendor.phone}</Detail></div>
        <div className="dialog-actions"><Button variant="outline" onClick={() => open("vendor-form", vendor.id)}>Ubah Vendor</Button></div>
      </>;
      break;
    case "vendor-form":
      title = vendor ? "Ubah Vendor" : "Tambah Vendor";
      submitLabel = "Simpan Vendor";
      content = <VendorFields vendor={vendor} />;
      break;
    case "quote-form":
      title = "Tambah Penawaran";
      if (data.vendors.length) {
        submitLabel = "Simpan Penawaran";
        content = <QuoteFields request={request} vendors={data.vendors} />;
      } else {
        content = <><p className="info">Tambahkan vendor untuk mengaitkan penawaran dengan pemasok.</p>
          <div className="dialog-actions"><Button icon="plus" onClick={() => open("vendor-form", "", request.id)}>Tambah Vendor</Button></div></>;
      }
      break;
    case "po-form": {
      const quote = request.quotes.find(item => item.id === extra);
      const expected = dateKey(new Date(Date.now() + quote.lead * 86400000));
      title = "Terbitkan Purchase Order";
      submitLabel = "Terbitkan PO";
      content = <>
        <div className="detail-grid"><Detail label="Permintaan">{request.id}</Detail>
          <Detail label="Vendor">{data.vendors.find(item => item.id === quote.vendor)?.name}</Detail>
          <Detail label="Nilai PO">{money.format(quotedTotal(request, quote))}</Detail></div>
        <input type="hidden" name="quote" value={quote.id} />
        <Field label="Target barang tiba" name="expected" type="date" value={expected} min={dateKey()} />
      </>;
      break;
    }
    case "order":
      title = order.id;
      content = <OrderDetails order={order} data={data} open={open} />;
      break;
    case "receipt-form":
      title = "Catat Penerimaan · " + order.id;
      submitLabel = "Simpan Penerimaan";
      content = <>
        <div className="form-grid">
          <Field label="Tanggal diterima" name="date" type="date" value={dateKey()} min={order.date} max={dateKey()} />
          <Field label="Nomor surat jalan" name="ref" maxLength={100} />
          <Notes label="Catatan pemeriksaan (opsional)" />
        </div>
        <div className="subhead"><h3>Jumlah yang Diterima</h3></div>
        <div className="form-grid">{order.items.map((item, index) => {
          const remaining = item.qty - receivedAt(order, index);
          return <Field key={index} label={item.name + " · sisa " + remaining} name={"qty" + index}
            type="number" value={0} min={0} max={remaining} step={1} />;
        })}</div>
      </>;
      break;
    case "reject":
      title = submitLabel = "Tolak Permintaan";
      content = <Notes label="Alasan penolakan" name="reason" required />;
      break;
    case "import":
      title = "Impor Data Versi Lama";
      submitLabel = "Impor ke Supabase";
      content = <><p className="info">Di versi lama, pilih Ekspor Data Lokal lalu unggah file JSON yang diunduh. Data akan tersimpan di akun ini.</p>
        <Field label="File data pengadaan" name="backup" type="file" accept=".json,application/json" /></>;
      break;
    default:
      title = submitLabel = confirmations[kind][0];
      content = <p className="info">{confirmations[kind][1]}</p>;
  }
  return <Modal title={title} close={close} busy={busy}>
    {submitLabel ? <form onSubmit={event => {
      event.preventDefault();
      submit(new FormData(event.currentTarget));
    }}>
      <fieldset className="form-fields" disabled={busy}>{content}</fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <Button variant="outline" onClick={close} disabled={busy}>Batal</Button>
        <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : submitLabel}</Button>
      </div>
    </form> : content}
  </Modal>;
}
