import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path === "/login" || path === "/registro";

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  /* Rutas operativas: solo admin / agente */
  if (
    user &&
    (path.startsWith("/dashboard/propiedades") ||
      path.startsWith("/dashboard/cobranzas") ||
      path.startsWith("/dashboard/proveedores"))
  ) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    const rol = perfil?.rol as string | undefined;
    if (rol !== "admin" && rol !== "agente") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      const aviso = path.startsWith("/dashboard/cobranzas")
        ? "cobranzas_staff"
        : path.startsWith("/dashboard/proveedores")
          ? "proveedores_staff"
          : "propiedades_staff";
      url.searchParams.set("aviso", aviso);
      return NextResponse.redirect(url);
    }
  }

  /* Creación de usuarios reservada a admin: validar en Server Actions / rutas API (p. ej. /dashboard/equipo). */

  return supabaseResponse;
}
