import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { ContractTemplate } from "@/components/contratos/contract-template";
import { AutoPrint } from "@/components/contratos/auto-print";

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ContratoImprimirPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: raw, error } = await supabase
    .from("contratos")
    .select(
      `
      id,
      fecha_firma,
      fecha_inicio_contrato,
      fecha_fin_contrato,
      valor_mensual,
      valor_deposito,
      tipo_ajuste,
      caracteristicas_propiedad,
      datos_garantes,
      propiedad:propiedades ( direccion ),
      propietario:clientes!contratos_propietario_id_fkey ( nombre_completo, dni ),
      inquilino:clientes!contratos_cliente_id_fkey ( nombre_completo, dni )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !raw) {
    notFound();
  }

  const r = raw as Record<string, unknown>;
  const prop = unwrapFk(r.propiedad as { direccion?: string } | null);
  const propietario = unwrapFk(r.propietario as { nombre_completo?: string; dni?: number } | null);
  const inquilino = unwrapFk(r.inquilino as { nombre_completo?: string; dni?: number } | null);

  const data = buildContratoLocacionPdfData({
    fecha_firma: r.fecha_firma as string,
    fecha_inicio_contrato: r.fecha_inicio_contrato as string,
    fecha_fin_contrato: r.fecha_fin_contrato as string,
    valor_mensual: Number(r.valor_mensual),
    valor_deposito:
      r.valor_deposito != null && r.valor_deposito !== "" ? Number(r.valor_deposito) : null,
    tipo_ajuste: (r.tipo_ajuste as string) ?? "",
    caracteristicas_propiedad: (r.caracteristicas_propiedad as string) ?? "",
    datos_garantes: (r.datos_garantes as string) ?? "",
    inquilino_nombre: (inquilino?.nombre_completo as string) ?? "",
    inquilino_dni: inquilino?.dni ?? "",
    propietario_nombre: (propietario?.nombre_completo as string) ?? "",
    propietario_dni: propietario?.dni ?? "",
    propiedad_direccion: (prop?.direccion as string) ?? "",
  });

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <AutoPrint />
      <ContractTemplate data={data} />
    </div>
  );
}
