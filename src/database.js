import { createClient } from "@supabase/supabase-js";
import { emptyWorkspace } from "./workflow.js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
let client = null;
let configurationError = "";
if (url && key) {
  try {
    client = createClient(url, key);
  } catch {
    configurationError = "URL Supabase tidak valid. Periksa konfigurasi proyek.";
  }
}
export { client, configurationError };

const table = "procurement_workspaces";
const columns = "payload,revision";
export class RevisionConflict extends Error {
  constructor() {
    super("Data telah berubah di perangkat lain. Muat ulang sebelum melanjutkan.");
  }
}
export async function loadWorkspace(owner) {
  const { data, error } = await client.from(table).select(columns).eq("owner_id", owner).maybeSingle();
  if (error) throw error;
  return data ?? { payload: emptyWorkspace(), revision: 0 };
}
export async function saveWorkspace(owner, revision, payload) {
  const query = client.from(table);
  const { data, error } = revision === 0
    ? await query.insert({ owner_id: owner, revision: 1, payload }).select(columns).single()
    : await query.update({ revision: revision + 1, payload })
        .eq("owner_id", owner).eq("revision", revision).select(columns).maybeSingle();
  if (error?.code === "23505" || (!data && !error)) throw new RevisionConflict();
  if (error) throw error;
  return data;
}
