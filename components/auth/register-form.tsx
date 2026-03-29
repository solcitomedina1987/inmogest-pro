"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

/**
 * El trigger `on_auth_user_created` crea la fila en `public.perfiles` con rol `cliente`.
 * `nombre` va en user metadata y lo lee `handle_new_user` (raw_user_meta_data.nombre).
 */
export function RegisterForm() {
  const router = useRouter();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombreCompleto.trim() || email.trim().split("@")[0],
        },
      },
    });

    setLoading(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.session) {
      router.refresh();
      router.push("/dashboard");
      return;
    }

    setInfo(
      "Te enviamos un enlace de confirmación. Revisá tu correo; cuando confirmes la cuenta podés iniciar sesión.",
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <BrandLogo
        className="w-full max-w-[302.5px] max-h-[4.8125rem] min-w-0"
        priority
      />
      <Card className="w-full border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Tu perfil en la base de datos se crea automáticamente con rol cliente.
        </CardDescription>
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
            <Alert>
              <AlertTitle>Revisá tu correo</AlertTitle>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="reg-nombre">Nombre completo</Label>
            <Input
              id="reg-nombre"
              type="text"
              autoComplete="name"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="María García"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Contraseña</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta…" : "Registrarme"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
    </div>
  );
}
