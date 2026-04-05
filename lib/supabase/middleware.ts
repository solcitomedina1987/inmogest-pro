import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function isDashboardRoot(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/dashboard/";
}

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
  const isPortal = path.startsWith("/portal");
  const isAuthPage =
    path === "/login" ||
    path === "/registro" ||
    path === "/forgot-password" ||
    path === "/update-password";

  /* Rutas protegidas requieren sesión. */
  if ((isDashboard || isPortal) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  /* Usuarios logueados en páginas de auth o en /dashboard → redirigir según rol. */
  if (user && (isAuthPage || isDashboard) && path !== "/update-password") {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    const esAdmin = perfil?.rol === "admin";

    if (isAuthPage) {
      /* Después del login: admin → dashboard, inquilino → portal. */
      const url = request.nextUrl.clone();
      url.pathname = esAdmin ? "/dashboard" : "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    /* Inquilino intentando acceder a /dashboard → redirigir al portal. */
    if (isDashboard && !esAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
