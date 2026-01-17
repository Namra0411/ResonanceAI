import { supabase } from "./supabase.js";

export async function downloadFromSupabase(storageKey) {
  const { data, error } = await supabase.storage
    .from("documents")
    .download(storageKey);

  if (error) {
    throw new Error(`Supabase download failed: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
