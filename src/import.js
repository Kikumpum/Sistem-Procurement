import { emptyWorkspace, labels } from "./workflow.js";

const strings = (item, keys) => item && keys.every(key => typeof item[key] === "string");
const integer = (number, minimum = 0) => Number.isSafeInteger(number) && number >= minimum;
const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const itemList = items => Array.isArray(items) && items.length > 0 && items.length <= 25 &&
  items.every(item => strings(item, ["name"]) && integer(item.qty, 1) && item.qty <= 100000 &&
    integer(item.price) && item.price <= 1000000000);
const nonnegativeList = (values, length) => Array.isArray(values) && values.length === length &&
  values.every(value => integer(value));
const ids = (records, prefix) => {
  const values = records.map(record => record.id);
  if (new Set(values).size !== values.length || values.some(id => typeof id !== "string" ||
    !new RegExp("^" + prefix + "-[0-9]+$").test(id) || !integer(Number(id.split("-")[1]), 1))) {
    throw new Error("Nomor dokumen dalam file tidak valid atau duplikat.");
  }
  return new Set(values);
};

export async function readLegacyBackup(file) {
  if (!file?.size) throw new Error("Pilih file JSON dari versi lama.");
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error("File cadangan bukan JSON yang valid.");
  }
  const { requests, vendors, orders } = backup ?? {};
  const valid = Array.isArray(vendors) && vendors.every(vendor =>
    strings(vendor, ["id", "name", "category", "contact", "email", "phone"])) &&
    Array.isArray(requests) && requests.every(request =>
      strings(request, ["id", "title", "department", "requester", "status", "note"]) &&
      Object.hasOwn(labels, request.status) && validDate(request.need) && validDate(request.created) &&
      itemList(request.items) && Array.isArray(request.quotes) && Array.isArray(request.history) &&
      request.history.every(entry => strings(entry, ["message"]) && validDate(entry.date))) &&
    Array.isArray(orders) && orders.every(order =>
      strings(order, ["id", "request", "vendor"]) && validDate(order.date) &&
      validDate(order.expected) && itemList(order.items) && Array.isArray(order.receipts));
  if (!valid) throw new Error("Isi file tidak sesuai dengan format data Ruang Pengadaan versi lama.");

  const requestIds = ids(requests, "PR");
  const vendorIds = ids(vendors, "V");
  const quotes = requests.flatMap(request => request.quotes);
  const receipts = orders.flatMap(order => order.receipts);
  const validLinks = requests.every(request => request.quotes.every(quote =>
    strings(quote, ["id", "vendor", "ref"]) && vendorIds.has(quote.vendor) &&
    integer(quote.lead) && quote.lead <= 3650 && nonnegativeList(quote.prices, request.items.length) &&
    quote.prices.every(price => price <= 1000000000))) &&
    new Set(orders.map(order => order.request)).size === orders.length &&
    orders.every(order => requestIds.has(order.request) && vendorIds.has(order.vendor) &&
      order.receipts.every(receipt => strings(receipt, ["id", "ref", "note"]) && validDate(receipt.date) &&
        nonnegativeList(receipt.quantities, order.items.length)) &&
      order.items.every((item, index) =>
        order.receipts.reduce((sum, receipt) => sum + receipt.quantities[index], 0) <= item.qty));
  if (!validLinks) throw new Error("Ada penawaran, pesanan, atau penerimaan dengan referensi yang tidak valid.");

  const workspace = { ...emptyWorkspace(), requests, vendors, orders };
  const recordIds = { PR: requestIds, V: vendorIds, Q: ids(quotes, "Q"), PO: ids(orders, "PO"), GR: ids(receipts, "GR") };
  for (const [prefix, values] of Object.entries(recordIds)) {
    const previous = backup.sequence?.[prefix];
    workspace.sequence[prefix] = [...values].reduce((maximum, id) =>
      Math.max(maximum, Number(id.split("-")[1])), integer(previous) ? previous : 0);
  }
  return workspace;
}
