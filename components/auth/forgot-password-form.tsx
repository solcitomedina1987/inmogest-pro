"use client";

import { useState } from "react";
import Link from "next/link";
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/update-password`,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setInfo("Si el email está registrado, recibirás un enlace para elegir una nueva contraseña.");
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <BrandLogo className="w-full max-w-[453.75px] max-h-[7.21875rem] min-w-0" priority />
      <Card className="w-full border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
          <CardDescription>Ingresá el email de tu cuenta. Te enviaremos un enlace seguro.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {info ? (
              <Alert className="border-2 border-primary/35 bg-primary/12 shadow-sm">
                <AlertTitle className="text-base font-bold text-foreground">Revisá tu email</AlertTitle>
                <AlertDescription className="text-foreground/90 mt-1 text-sm font-medium leading-relaxed">
                  {info}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
