import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  const redirectTo = safeRedirectPath(redirect, "/dashboard");

  return <LoginForm redirectTo={redirectTo} />;
}
