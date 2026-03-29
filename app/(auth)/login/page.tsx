import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  const redirectTo = safeRedirectPath(redirect, "/dashboard");

  return <LoginForm redirectTo={redirectTo} />;
}
