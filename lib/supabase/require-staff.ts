import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type StaffResult =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; supabase: SupabaseClient | null; code: "no-auth" | "forbidden" };

export async function requireStaff(): Promise<StaffResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, supabase: null, code: "no-auth" };
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();

  const rol = perfil?.rol as string | undefined;
  if (rol !== "admin" && rol !== "agente") {
    return { ok: false, supabase, code: "forbidden" };
  }

  return { ok: true, supabase, user };
}
