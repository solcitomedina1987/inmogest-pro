import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { deriveContratoLocacionEstado } from "@/lib/contratos/derive-estado-contrato";
import { publicStorageObjectUrl } from "@/lib/supabase/public-storage-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BUCKET = "contratos-pdf";

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ContratoDetallePage({ params }: PageProps) {
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
      tipo_ajuste,
      caracteristicas_propiedad,
      datos_garantes,
      estado,
      rescindido_at,
      pdf_storage_path,
      contratos_cobranza_id,
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

  const pdfUrl =
    r.pdf_storage_path && typeof r.pdf_storage_path === "string"
      ? publicStorageObjectUrl(BUCKET, r.pdf_storage_path as string)
      : null;

  const est = deriveContratoLocacionEstado({
    fecha_fin_contrato: r.fecha_fin_contrato as string,
    rescindido_at: (r.rescindido_at as string | null) ?? null,
    estado: r.estado as string | null,
  });

  const pdfData = buildContratoLocacionPdfData({
    fecha_firma: r.fecha_firma as string,
    fecha_inicio_contrato: r.fecha_inicio_contrato as string,
    fecha_fin_contrato: r.fecha_fin_contrato as string,
    valor_mensual: Number(r.valor_mensual),
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/contratos">← Volver al listado</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {pdfUrl ? (
            <Button size="sm" variant="secondary" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                Abrir PDF
              </a>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/contratos/${id}/imprimir`}>Vista para imprimir (HTML)</Link>
          </Button>
          {r.contratos_cobranza_id ? (
            <Button size="sm" asChild>
              <Link href={`/dashboard/cobranzas/${r.contratos_cobranza_id as string}`}>Ver en cobranzas</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">Contrato</CardTitle>
            <Badge variant={est === "VIGENTE" ? "default" : est === "VENCIDO" ? "destructive" : "secondary"}>
              {est === "VIGENTE" ? "Vigente" : est === "VENCIDO" ? "Vencido" : "Rescindido"}
            </Badge>
          </div>
          <CardDescription>Resumen de datos registrados (el PDF oficial está en Storage).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Dirección:</span> {pdfData.propiedadDireccion}
          </p>
          <p>
            <span className="text-muted-foreground">Locador:</span> {pdfData.propietarioLine}
          </p>
          <p>
            <span className="text-muted-foreground">Locatario:</span> {pdfData.inquilinoLine}
          </p>
          <p>
            <span className="text-muted-foreground">Vigencia:</span> {pdfData.fechaInicioFmt} — {pdfData.fechaFinFmt}
          </p>
          <p>
            <span className="text-muted-foreground">Canon:</span> {pdfData.valorMensualFmt} ({pdfData.tipoAjuste})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
