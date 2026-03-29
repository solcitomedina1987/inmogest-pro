"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setReady(true);
      }
    });

    const t = window.setTimeout(() => {
      setTimedOut(true);
    }, 10000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: uErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    router.refresh();
    router.push("/login?passwordActualizada=1");
  }

  const showWait = !ready && !timedOut;
  const showInvalid = !ready && timedOut;

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <BrandLogo className="w-full max-w-[453.75px] max-h-[7.21875rem] min-w-0" priority />
      <Card className="w-full border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Nueva contraseña</CardTitle>
          <CardDescription>Elegí una contraseña nueva. No necesitás la anterior.</CardDescription>
        </CardHeader>
        {showWait ? (
          <CardContent>
            <p className="text-muted-foreground text-sm">Validando enlace de recuperación…</p>
          </CardContent>
        ) : showInvalid ? (
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Enlace inválido o vencido</AlertTitle>
              <AlertDescription>
                Pedí un nuevo enlace desde{" "}
                <Link href="/forgot-password" className="underline font-medium">
                  Olvidé mi contraseña
                </Link>
                .
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Repetir contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                  Ir al inicio de sesión
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
