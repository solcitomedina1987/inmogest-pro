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
  const isAuthPage =
    path === "/login" ||
    path === "/registro" ||
    path === "/forgot-password" ||
    path === "/update-password";

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && path !== "/update-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  /* Solo administradores acceden a /dashboard/* fuera de la raíz. */
  if (user && isDashboard && !isDashboardRoot(path)) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    if (perfil?.rol !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      url.searchParams.set("restringido", "1");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
