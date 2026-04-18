import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { homePathForRol } from "@/lib/auth-redirect-home";

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
  const isPropietarios = path.startsWith("/propietarios");
  const isAuthPage =
    path === "/login" ||
    path === "/registro" ||
    path === "/forgot-password" ||
    path === "/update-password";
  const isAuthCallback = path === "/auth/callback";

  type PerfilMini = { rol: string; is_active: boolean | null } | null;
  let perfil: PerfilMini = null;

  if (user) {
    const { data } = await supabase
      .from("perfiles")
      .select("rol, is_active")
      .eq("id", user.id)
      .maybeSingle();
    perfil = data as PerfilMini;

    if (!isAuthPage && !isAuthCallback && perfil?.is_active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "cuenta_inactiva");
      return NextResponse.redirect(url);
    }
  }

  /* Rutas protegidas requieren sesión. */
  if ((isDashboard || isPortal || isPropietarios) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  /* Usuarios logueados en páginas de auth → redirigir según rol. */
  if (user && (isAuthPage || isDashboard) && path !== "/update-password" && !isPortal && !isPropietarios) {
    if (perfil?.is_active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "cuenta_inactiva");
      return NextResponse.redirect(url);
    }

    const rol = perfil?.rol ?? "cliente";
    const home = homePathForRol(rol);

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }

    /* Inquilino en /dashboard → portal */
    if (isDashboard && rol === "cliente") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    /* Propietario en /dashboard → su portal */
    if (isDashboard && rol === "propietario") {
      const url = request.nextUrl.clone();
      url.pathname = "/propietarios/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  /* Portal inquilino: solo rol cliente */
  if (user && isPortal) {
    const rol = perfil?.rol ?? "cliente";
    if (rol !== "cliente") {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRol(rol);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  /* Portal propietarios: solo rol propietario */
  if (user && isPropietarios) {
    const rol = perfil?.rol ?? "cliente";
    if (rol !== "propietario") {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRol(rol);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
