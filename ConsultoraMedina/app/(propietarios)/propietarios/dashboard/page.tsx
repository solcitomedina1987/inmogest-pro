import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarClock, Download, Eye, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PropietarioHeader } from "@/components/propietarios/propietario-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mesPeriodoActual,
  mesPeriodoConOffset,
  proximaFechaActualizacionAlquiler,
} from "@/lib/cobranzas/estado-contrato";
import { etiquetaEstadoPropiedad } from "@/lib/propietario/estado-propiedad";
import { resolveContratoDescargaUrl } from "@/lib/contratos/contrato-descarga";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function mesRango(offset: number): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

type ContratoRow = {
  id: string;
  propiedad_id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  is_active: boolean;
  meses_actualizacion: number;
  ultima_actualizacion: string | null;
  inquilino: { nombre_completo: string } | null;
};

type PropRow = {
  id: string;
  direccion: string;
  estado: string;
  cliente_inquilino: { nombre_completo: string } | { nombre_completo: string }[] | null;
};

type ContratoLegalMini = {
  contratos_cobranza_id: string;
  pdf_storage_path: string | null;
  adjunto_storage_path: string | null;
  adjunto_mime: string | null;
};

function contratoParaPropiedad(contratos: ContratoRow[], propiedadId: string): ContratoRow | null {
  const matches = contratos.filter((c) => c.propiedad_id === propiedadId);
  return matches.find((c) => c.is_active) ?? matches[0] ?? null;
}

export default async function PropietariosDashboardPage() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const db = createServiceRoleClient();
  const { data: perfil, error: pe } = await db
    .from("perfiles")
    .select("cliente_id, nombre, is_active")
    .eq("id", user.id)
    .eq("rol", "propietario")
    .maybeSingle();

  if (pe || !perfil?.cliente_id || perfil.is_active === false) {
    redirect("/login?error=cuenta_inactiva");
  }

  const clienteId = perfil.cliente_id as string;

  const { data: propsRaw, error: propsErr } = await db
    .from("propiedades")
    .select(
      `
      id,
      direccion,
      estado,
      cliente_inquilino:clientes!propiedades_cliente_id_fkey ( nombre_completo )
    `,
    )
    .eq("propietario_id", clienteId)
    .eq("is_active", true)
    .order("direccion", { ascending: true });

  if (propsErr) {
    return (
      <div className="p-6 text-sm text-destructive">
        Error al cargar propiedades: {propsErr.message}
      </div>
    );
  }

  const propsList = (propsRaw ?? []) as PropRow[];
  const propIds = propsList.map((p) => p.id);

  let contratos: ContratoRow[] = [];

  if (propIds.length > 0) {
    const { data: cRaw } = await db
      .from("contratos_cobranza")
      .select(
        `
        id,
        propiedad_id,
        fecha_inicio,
        fecha_vencimiento,
        is_active,
        meses_actualizacion,
        ultima_actualizacion,
        inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo )
      `,
      )
      .in("propiedad_id", propIds)
      .is("deleted_at", null);

    contratos = (cRaw ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        propiedad_id: row.propiedad_id as string,
        fecha_inicio: row.fecha_inicio as string,
        fecha_vencimiento: row.fecha_vencimiento as string,
        is_active: Boolean(row.is_active),
        meses_actualizacion: Number(row.meses_actualizacion),
        ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
        inquilino: unwrapFk(row.inquilino as { nombre_completo: string } | null),
      };
    });
  }

  const legalPorCobranza = new Map<string, ContratoLegalMini>();
  const cobIds = contratos.map((c) => c.id);
  if (cobIds.length > 0) {
    const { data: legRows } = await db
      .from("contratos")
      .select("contratos_cobranza_id, pdf_storage_path, adjunto_storage_path, adjunto_mime")
      .in("contratos_cobranza_id", cobIds);
    for (const row of legRows ?? []) {
      const x = row as ContratoLegalMini;
      if (x.contratos_cobranza_id) {
        legalPorCobranza.set(x.contratos_cobranza_id, x);
      }
    }
  }

  const totalProps = propsList.length;
  const alquiladas = propsList.filter((p) => p.estado === "Alquilada").length;

  const m0 = mesRango(0);
  const m2 = mesRango(2);
  const ventanaInicio = m0.start;
  const ventanaFin = m2.end;

  let vencimientosProximos = 0;
  for (const c of contratos) {
    if (!c.is_active) {
      continue;
    }
    const fv = c.fecha_vencimiento;
    if (fv >= ventanaInicio && fv <= ventanaFin) {
      vencimientosProximos += 1;
    }
  }

  const hoy = new Date();
  const ym0 = mesPeriodoActual(hoy);
  const ym1 = mesPeriodoConOffset(hoy, 1);
  const ym2 = mesPeriodoConOffset(hoy, 2);
  let actualizacionesProximas = 0;
  for (const c of contratos) {
    if (!c.is_active) {
      continue;
    }
    const prox = proximaFechaActualizacionAlquiler(
      c.fecha_inicio,
      c.fecha_vencimiento,
      c.meses_actualizacion,
      c.ultima_actualizacion,
      hoy,
    );
    if (!prox) {
      continue;
    }
    const pym = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}`;
    if (pym === ym0 || pym === ym1 || pym === ym2) {
      actualizacionesProximas += 1;
    }
  }

  return (
    <>
      <PropietarioHeader nombre={perfil.nombre as string} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis rentas</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Resumen de tus propiedades y contratos. Las actualizaciones de alquiler se calculan según la
            periodicidad y el índice definidos en cada contrato (misma lógica que el simulador Arquiler).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border shadow-sm border-l-4 border-l-sky-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mis propiedades</CardTitle>
              <Building2 className="size-4 text-sky-700" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{totalProps}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                <span className="font-medium text-foreground">{alquiladas}</span> alquiladas
                {totalProps > alquiladas ? (
                  <>
                    {" "}
                    · <span className="tabular-nums">{totalProps - alquiladas}</span> sin alquiler activo en
                    cartel
                  </>
                ) : null}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencimientos próximos</CardTitle>
              <CalendarClock className="size-4 text-amber-700" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-amber-900 dark:text-amber-200">
                {vencimientosProximos}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Contratos activos que vencen en el mes actual o en los dos siguientes.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm border-l-4 border-l-violet-600 sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actualizaciones próximas</CardTitle>
              <TrendingUp className="size-4 text-violet-700" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-violet-900 dark:text-violet-200">
                {actualizacionesProximas}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Contratos activos con hito de revisión de alquiler en el mes actual o los dos siguientes
                (calendario de actualización contractual).
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Propiedades</CardTitle>
            <p className="text-muted-foreground text-sm">
              Dirección, estado comercial e inquilino vinculado. Podés ver el historial de cobranzas de cada
              inmueble.
            </p>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {propsList.length === 0 ? (
              <p className="text-muted-foreground px-6 py-10 text-center text-sm">
                No tenés propiedades activas cargadas a tu nombre.
              </p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Inquilino</TableHead>
                      <TableHead className="hidden md:table-cell">Contrato</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">Descarga</TableHead>
                      <TableHead className="w-[72px] text-right">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propsList.map((p) => {
                      const etiqueta = etiquetaEstadoPropiedad(p.estado);
                      const inqFicha = unwrapFk(p.cliente_inquilino);
                      const ct = contratoParaPropiedad(contratos, p.id);
                      const nombreInq =
                        ct?.inquilino?.nombre_completo?.trim() ||
                        inqFicha?.nombre_completo?.trim() ||
                        "—";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium whitespace-nowrap">{p.direccion}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                etiqueta === "Alquilada" && "bg-emerald-100 text-emerald-900",
                                etiqueta === "En alquiler" && "bg-sky-100 text-sky-900",
                                etiqueta === "Disponible" && "bg-zinc-100 text-zinc-800",
                              )}
                            >
                              {etiqueta}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{nombreInq}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground tabular-nums">
                            {etiqueta === "Alquilada" && ct ? (
                              <span>
                                {ct.fecha_inicio} → {ct.fecha_vencimiento}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            {etiqueta === "Alquilada" && ct ? (
                              (() => {
                                const leg = legalPorCobranza.get(ct.id);
                                const d = leg
                                  ? resolveContratoDescargaUrl({
                                      pdf_storage_path: leg.pdf_storage_path,
                                      adjunto_storage_path: leg.adjunto_storage_path,
                                      adjunto_mime: leg.adjunto_mime,
                                    })
                                  : null;
                                if (!d) {
                                  return <span className="text-muted-foreground text-xs">—</span>;
                                }
                                return (
                                  <Button variant="default" size="sm" className="gap-1.5" asChild>
                                    <a href={d.href} target="_blank" rel="noopener noreferrer">
                                      <Download className="size-3.5 shrink-0" aria-hidden />
                                      <span className="hidden lg:inline">{d.esPdf ? "PDF" : "Archivo"}</span>
                                    </a>
                                  </Button>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild className="shrink-0">
                              <Link href={`/propietarios/propiedad/${p.id}/cobranzas`} aria-label="Ver cobranzas">
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
