import { useEffect, useRef } from "react";
import { icons } from "./icons.js";
import { labels } from "./workflow.js";

export function Icon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}

export function Button({ children, icon, variant = "", type = "button", ...props }) {
  return <button type={type} className={"button " + variant} {...props}>
    {icon && <Icon name={icon} />}{children}
  </button>;
}

export function Table({ headers, rows, empty = "Belum ada data." }) {
  return <div className="table-scroll"><table><thead><tr>
    {headers.map(header => <th scope="col" key={header}>{header}</th>)}
  </tr></thead><tbody>
    {rows.length ? rows : <tr><td className="empty" colSpan={headers.length}>{empty}</td></tr>}
  </tbody></table></div>;
}

export function Status({ status }) {
  return <span className={"status " + status}>{labels[status]}</span>;
}

export function Field({ label, value, type = "text", required = true, ...props }) {
  return <label>{label}<input className="field" type={type} required={required}
    defaultValue={value ?? ""} {...props} /></label>;
}

export function Notes({ label, name = "note", value, required = false }) {
  return <label className="full">{label}
    <textarea className="field" name={name} defaultValue={value ?? ""} required={required} maxLength={1000} />
  </label>;
}

export function Detail({ label, children }) {
  return <div><small>{label}</small><p>{children || "—"}</p></div>;
}

export function Modal({ title, close, busy, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => {
    event.preventDefault();
    if (!busy) close();
  }}>
    <div className="dialog-head">
      <h2 id="dialog-title">{title}</h2>
      <button className="icon-button" type="button" aria-label="Tutup" onClick={close} disabled={busy}><Icon name="close" /></button>
    </div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}
