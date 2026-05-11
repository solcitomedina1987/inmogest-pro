import { DashboardRestriccionAlert } from "@/components/dashboard/dashboard-restriccion-alert";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let isCliente = false;
  if (user) {
    const { data: p } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
    isAdmin = p?.rol === "admin";
    isCliente = p?.rol === "cliente";
  }

  return (
    <>
      <DashboardRestriccionAlert />
      <DashboardShell isAdmin={isAdmin} isCliente={isCliente}>
        {children}
      </DashboardShell>
    </>
  );
}
