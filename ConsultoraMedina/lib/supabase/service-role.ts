import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: solo en Server Actions protegidas (p. ej. tras `requireAdmin`).
 * Requiere `SUPABASE_SERVICE_ROLE_KEY` en variables de entorno del servidor.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no configurados.");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
