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
      </CardContent>
    </Card>
  );
}
