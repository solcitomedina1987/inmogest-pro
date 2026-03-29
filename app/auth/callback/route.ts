import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

function safeRedirectPath(next: string | null): string {
  const p = (next ?? "/dashboard").trim() || "/dashboard";
  if (!p.startsWith("/") || p.startsWith("//")) {
    return "/dashboard";
  }
  return p;
}

/**
 * OAuth PKCE y confirmación de email (Supabase).
 * Tras intercambiar el `code`, si `type` es verificación de email, se añade `?first_login=true`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = safeRedirectPath(searchParams.get("next"));
  const type = searchParams.get("type");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* ignorado si no hay writable store */
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const dest = new URL(nextPath, origin);
  if (type === "signup" || type === "email") {
    dest.searchParams.set("first_login", "true");
  }

  return NextResponse.redirect(dest.toString());
}
