import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseInformeRendicionPayload } from "@/lib/informes/parse-informe-payload";
import { InformeRendicionVista } from "@/components/informes/informe-rendicion-vista";
import { InformeRendicionDetalleToolbar } from "@/components/informes/informe-rendicion-detalle-toolbar";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Rendición ${id.slice(0, 8)}…` };
}

export default async function InformeRendicionDetallePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  const { data: row, error } = await supabase
    .from("informes_rendicion")
    .select("id, payload, fecha_generacion")
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.payload) {
    notFound();
  }

  const payload = parseInformeRendicionPayload(row.payload);
  if (!payload) {
    notFound();
  }

  return (
    <div>
      <InformeRendicionDetalleToolbar informeId={row.id as string} />
      <InformeRendicionVista payload={payload} fechaGeneracion={row.fecha_generacion as string} />
    </div>
  );
}
