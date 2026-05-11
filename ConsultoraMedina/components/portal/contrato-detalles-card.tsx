import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function fmtFecha(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function ServiciosPropiedad({ contrato }: { contrato: ContratoCobranzaRow }) {
  const p = contrato.propiedad;
  if (!p) return null;
  const filas: { label: string; value: string }[] = [];
  if (p.nis_electricidad?.trim()) filas.push({ label: "NIS electricidad", value: p.nis_electricidad.trim() });
  if (p.cliente_gas?.trim()) filas.push({ label: "Cliente gas", value: p.cliente_gas.trim() });
  if (p.padron_municipal?.trim()) filas.push({ label: "Padrón municipal", value: p.padron_municipal.trim() });
  if (p.cliente_internet?.trim()) filas.push({ label: "Internet", value: p.cliente_internet.trim() });
  if (filas.length === 0) return null;
  return (
    <div className="border-t border-border pt-4 sm:col-span-2 lg:col-span-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Servicios en la propiedad</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {filas.map((f) => (
          <div key={f.label}>
            <dt className="text-muted-foreground text-xs">{f.label}</dt>
            <dd className="mt-0.5 font-medium break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ContratoDetallesCard({ contrato }: { contrato: ContratoCobranzaRow }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Detalles del contrato</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propiedad</p>
          <p className="mt-1 font-medium">{contrato.propiedad?.nombre ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto mensual</p>
          <p className="mt-1 font-semibold tabular-nums">{precioFmt.format(Number(contrato.monto_mensual))}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Día límite de pago</p>
          <p className="mt-1 tabular-nums">Día {contrato.dia_limite_pago}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inicio</p>
          <p className="mt-1 tabular-nums">{fmtFecha(contrato.fecha_inicio)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimiento</p>
          <p className="mt-1 tabular-nums">{fmtFecha(contrato.fecha_vencimiento)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actualización</p>
          <p className="mt-1">
            Cada {contrato.meses_actualizacion} meses · {contrato.indice_actualizacion}
          </p>
        </div>
        <ServiciosPropiedad contrato={contrato} />
      </CardContent>
    </Card>
  );
}
