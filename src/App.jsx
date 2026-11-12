import { useEffect, useRef, useState } from "react";
import { client, configurationError, loadWorkspace, saveWorkspace, RevisionConflict } from "./database.js";
import { Dashboard, WorkList } from "./pages.jsx";
import { WorkflowDialog } from "./dialogs.jsx";
import { Button, Field, Icon } from "./ui.jsx";
import { pages, submissions } from "./workflow.js";
import { readLegacyBackup } from "./import.js";

const navigationIcons = ["dashboard", "file", "users", "cart", "box"];
const day = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
const messages = {
  "request-form": "Draf disimpan.", "vendor-form": "Vendor disimpan.", "quote-form": "Penawaran dicatat.",
  "po-form": "Purchase order diterbitkan.", "receipt-form": "Penerimaan dicatat.", submit: "Permintaan diajukan.",
  reopen: "Permintaan kembali ke draf.", approve: "Permintaan disetujui.", reject: "Penolakan dicatat.",
  import: "Data versi lama diimpor."
};

function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.signInWithPassword({
        email: form.get("email").trim(),
        password: form.get("password")
      });
      if (error) throw error;
    } catch (error) {
      setError(error.code === "invalid_credentials"
        ? "Email atau kata sandi salah. Coba lagi."
        : "Gagal masuk. Periksa koneksi dan status akun di Supabase.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="auth-title">
    <div className="brand-mark"><Icon name="layers" /></div>
    <h1 id="auth-title">Ruang Pengadaan</h1>
    {!client ? <p className="info">{configurationError || "Hubungkan proyek Supabase untuk membuka aplikasi. Ikuti langkah di README."}</p>
      : <form onSubmit={signIn} aria-busy={busy}>
        <p>Masuk dengan akun pengadaanmu.</p>
        <Field label="Email" type="email" name="email" autoComplete="username" />
        <Field label="Kata sandi" type="password" name="password" autoComplete="current-password" />
        {error && <p className="error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</Button>
      </form>}
  </section></main>;
}

function readRoute() {
  const [page, status = ""] = location.hash.slice(1).split("/");
  return { page: Object.hasOwn(pages, page) ? page : "ringkasan", status };
}

function Workspace({ user }) {
  const [record, setRecord] = useState(null);
  const [route, setRoute] = useState(readRoute);
  const [view, setView] = useState(null);
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const lock = useRef(false);

  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setPending("load");
    setError("");
    try {
      setRecord(await loadWorkspace(user.id));
    } catch (error) {
      setError(error.code === "PGRST205" || error.code === "42P01"
        ? "Tabel pengadaan belum tersedia. Jalankan migrasi SQL di Supabase."
        : "Data gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      lock.current = false;
      setPending("");
    }
  }

  useEffect(() => {
    refresh();
    function update() {
      setRoute(readRoute());
      setMenu(false);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  function go(page, status = "") {
    location.hash = status ? page + "/" + status : page;
    setMenu(false);
  }

  function open(kind, id = "", extra = "") {
    setFormError("");
    setView({ kind, id, extra });
  }

  async function commit(form) {
    if (lock.current) return;
    lock.current = true;
    setPending("save");
    setFormError("");
    setNotice("");
    const { kind, id, extra } = view;
    let reload = false;
    try {
      let payload = structuredClone(record.payload);
      let createdId;
      if (kind === "import") {
        if (record.revision !== 0) throw new Error("Impor hanya tersedia untuk ruang pengadaan yang masih kosong.");
        payload = await readLegacyBackup(form.get("backup"));
      } else {
        createdId = submissions[kind](payload, form, id);
      }
      setRecord(await saveWorkspace(user.id, record.revision, payload));
      setNotice(messages[kind]);
      if (kind === "import") setView(null);
      else if (kind === "vendor-form" && extra) open("quote-form", extra);
      else if (kind === "vendor-form") open("vendor", createdId);
      else if (kind === "po-form") open("order", createdId);
      else if (kind === "receipt-form") open("order", id);
      else open("request", createdId || id);
    } catch (error) {
      if (error instanceof RevisionConflict) {
        setView(null);
        setNotice(error.message);
        reload = true;
      } else {
        setFormError(error.message || "Data gagal disimpan. Coba lagi.");
      }
    } finally {
      lock.current = false;
      setPending("");
    }
    if (reload) await refresh();
  }

  async function signOut() {
    if (lock.current) return;
    lock.current = true;
    setPending("logout");
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      setError("Gagal keluar. Coba lagi.");
    } finally {
      lock.current = false;
      setPending("");
    }
  }

  const data = record?.payload;
  const pendingCount = data?.requests.filter(request => request.status === "submitted").length;
  return <>
    <aside id="sidebar" className={"sidebar " + (menu ? "open" : "")}>
      <a className="brand" href="#ringkasan" onClick={() => setMenu(false)}><span className="brand-mark"><Icon name="layers" /></span>Ruang Pengadaan</a>
      <nav aria-label="Menu utama">{Object.entries(pages).map(([page, name], index) =>
        <a href={"#" + page} key={page} aria-current={page === route.page ? "page" : undefined} onClick={() => setMenu(false)}>
          <Icon name={navigationIcons[index]} />{name}
          {page === "permintaan" && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
        </a>)}</nav>
      <div className="side-bottom">
        <div className="profile"><span className="avatar">{user.email?.[0]?.toUpperCase() || "P"}</span>
          <div><strong>Akun pengadaan</strong><small title={user.email}>{user.email}</small></div>
        </div>
        <Button variant="outline" onClick={signOut} disabled={Boolean(pending)}>Keluar</Button>
      </div>
    </aside>
    {menu && <button className="menu-overlay" type="button" onClick={() => setMenu(false)} aria-label="Tutup menu" />}
    <div className="workspace">
      <header className="topbar"><div className="crumb">
        <button className="icon-button mobile-menu" type="button" aria-label="Buka menu" aria-controls="sidebar"
          aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="menu" /></button>
        <strong>{pages[route.page]}</strong>
      </div><div className="top-actions">
        <span className="today"><Icon name="calendar" />{day.format(new Date())}</span>
        <Button variant="outline" onClick={refresh} disabled={Boolean(pending)}>{pending === "load" ? "Memuat…" : "Muat Ulang"}</Button>
      </div></header>
      <main>
        {notice && <p className="info sync-notice" role="status">{notice}</p>}
        {error && <p className="info sync-notice" role="alert">{error}</p>}
        {data && (route.page === "ringkasan"
          ? <Dashboard data={data} go={go} open={open} canImport={record.revision === 0} />
          : <WorkList key={route.page + "/" + route.status} page={route.page} initialStatus={route.status} data={data} open={open} />)}
        {!data && !error && <p role="status">Memuat data pengadaan…</p>}
      </main>
    </div>
    {view && <WorkflowDialog key={view.kind + "/" + view.id + "/" + view.extra}
      view={view} data={data} open={open} close={() => setView(null)} error={formError} busy={pending === "save"} submit={commit} />}
  </>;
}

export function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => subscription.unsubscribe();
  }, []);
  if (!client || session === null) return <SignIn />;
  if (!session) return <main><p role="status">Memuat sesi…</p></main>;
  return <Workspace user={session.user} key={session.user.id} />;
}
