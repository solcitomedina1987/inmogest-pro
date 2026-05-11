import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaContrato } from "@/lib/contratos/contract-pdf-data";
import { deriveContratoLocacionEstado } from "@/lib/contratos/derive-estado-contrato";
import { publicStorageObjectUrl } from "@/lib/supabase/public-storage-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BUCKET = "contratos-pdf";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

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
      valor_deposito,
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

  const valorMensual = Number(r.valor_mensual);
  const depRaw = r.valor_deposito;
  const depNum =
    depRaw != null && depRaw !== "" && !Number.isNaN(Number(depRaw)) ? Number(depRaw) : null;
  const depositoEfectivo =
    depNum != null && depNum > 0 ? depNum : valorMensual;

  const direccion = (prop?.direccion as string)?.trim() || "—";
  const locador =
    propietario?.nombre_completo?.trim() != null
      ? `${propietario.nombre_completo}, DNI: ${propietario.dni ?? "—"}`
      : "—";
  const locatario =
    inquilino?.nombre_completo?.trim() != null
      ? `${inquilino.nombre_completo}, DNI: ${inquilino.dni ?? "—"}`
      : "—";

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
            <span className="text-muted-foreground">Dirección:</span> {direccion}
          </p>
          <p>
            <span className="text-muted-foreground">Locador:</span> {locador}
          </p>
          <p>
            <span className="text-muted-foreground">Locatario:</span> {locatario}
          </p>
          <p>
            <span className="text-muted-foreground">Vigencia:</span>{" "}
            {formatFechaContrato(r.fecha_inicio_contrato as string)} —{" "}
            {formatFechaContrato(r.fecha_fin_contrato as string)}
          </p>
          <p>
            <span className="text-muted-foreground">Canon:</span> {precioFmt.format(valorMensual)} (
            {(r.tipo_ajuste as string) ?? "—"})
          </p>
          <p>
            <span className="text-muted-foreground">Depósito (cláusula novena):</span>{" "}
            {precioFmt.format(depositoEfectivo)}
            {depNum == null || depNum <= 0 ? (
              <span className="text-muted-foreground"> (equivale al canon mensual)</span>
            ) : null}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
