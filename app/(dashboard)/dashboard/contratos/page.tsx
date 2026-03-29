import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Contratos",
};

export default async function DashboardContratosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Generador de contratos</h1>
      <p className="mt-2 text-sm text-neutral-600">Plantillas y contratos generados (pendiente).</p>
    </div>
  );
}
