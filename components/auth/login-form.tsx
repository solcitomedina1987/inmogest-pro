"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safe-redirect";
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
};

export function LoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const target = safeRedirectPath(redirectTo, "/dashboard");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    router.refresh();
    router.push(target);
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <BrandLogo
        className="w-full max-w-[302.5px] max-h-[4.8125rem] min-w-0"
        priority
      />
      <Card className="w-full border shadow-sm">
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
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Entrar"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-primary font-medium underline-offset-4 hover:underline">
              Registrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
    </div>
  );
}
