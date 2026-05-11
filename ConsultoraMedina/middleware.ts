import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Protección de rutas:
 * - `/dashboard/**` sin sesión → redirección a `/login` (con `?redirect=`).
 * - `/login` y `/registro` con sesión → `/dashboard`.
 * La lógica está en `lib/supabase/middleware.ts` (refresh de sesión Supabase + comprobaciones).
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
