"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { homePathForRol, redirectAllowedForRol } from "@/lib/auth-redirect-home";
import { safeRedirectPath } from "@/lib/safe-redirect";
import type { PerfilRol } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandLogo } from "@/components/brand/brand-logo";

type Props = {
  redirectTo: string;
  errorKey?: string;
};

const URL_ERRORS: Record<string, string> = {
  cuenta_inactiva: "Tu cuenta fue desactivada. Contactá a la administración.",
  auth: "No se pudo completar la autenticación. Probá de nuevo.",
};

export function LoginForm({ redirectTo, errorKey }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(errorKey ? (URL_ERRORS[errorKey] ?? null) : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signError || !data.user) {
      setLoading(false);
      setError(signError?.message ?? "Error al iniciar sesión.");
      return;
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (perfil?.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Tu cuenta fue desactivada. Contactá a la administración.");
      return;
    }

    const rol = (perfil?.rol ?? "cliente") as PerfilRol | string;
    const explicit = safeRedirectPath(redirectTo, "");

    if (explicit && redirectAllowedForRol(explicit, rol)) {
      router.refresh();
      router.push(explicit);
      return;
    }

    setLoading(false);
    router.refresh();
    router.push(homePathForRol(rol));
  }

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-8">
      <BrandLogo className="w-full max-w-[453.75px] max-h-[7.21875rem] min-w-0" priority />
      <Card className="w-full max-w-full border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>Ingresá tu email y contraseña.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Ingresando…
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              ¿No tenés cuenta?{" "}
              <Link
                href="/registro"
                className="text-foreground/80 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-foreground hover:decoration-stone-500"
              >
                Registrate
              </Link>
            </p>
            <p className="text-center text-xs leading-relaxed">
              <Link
                href="/forgot-password"
                className="text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-stone-400"
              >
                Recuperar contraseña
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
