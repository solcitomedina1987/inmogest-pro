import type { InformeRendicionPayloadV1 } from "@/lib/informes/rendicion-types";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

type Props = {
  payload: InformeRendicionPayloadV1;
  fechaGeneracion?: string | null;
  className?: string;
};

export function InformeRendicionVista({ payload, fechaGeneracion, className }: Props) {
  const fecha =
    fechaGeneracion != null
      ? new Date(fechaGeneracion).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })
      : new Date().toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className={cn("mx-auto max-w-3xl rounded-lg border bg-white p-6 text-stone-900 shadow-sm print:shadow-none", className)}>
      <header className="mb-6 flex flex-col items-center border-b pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo.PNG" alt="" className="h-14 w-auto max-w-[220px] object-contain" />
        <p className="text-muted-foreground mt-2 text-center text-xs">Informe de rendición</p>
      </header>

      <h1 className="text-xl font-bold tracking-tight">Rendición de cobranzas</h1>
      <div className="text-muted-foreground mt-3 space-y-1 text-sm">
        <p>
          <span className="font-medium text-foreground">Fecha de generación:</span> {fecha}
        </p>
        <p>
          <span className="font-medium text-foreground">Propietario:</span> {payload.propietario_nombre}
        </p>
        <p>
          <span className="font-medium text-foreground">Período:</span> {payload.mes_periodo} —{" "}
          <span className="font-medium text-foreground">Comisión:</span> {payload.comision_porcentaje}%
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Alquileres cobrados</h2>
        <div className="mt-2 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Propiedad</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {payload.alquileres.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-muted-foreground px-3 py-4 text-center">
                    Sin alquileres cobrados en el período.
                  </td>
                </tr>
              ) : (
                payload.alquileres.map((a) => (
                  <tr key={a.propiedad_id} className="border-t">
                    <td className="px-3 py-2">{a.etiqueta}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{precioFmt.format(a.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Otros conceptos</h2>
        <p className="text-muted-foreground mt-1 text-xs">Detalle de rubros adicionales registrados en recibos del período.</p>
        <div className="mt-2 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Concepto</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-left font-medium">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {payload.otros_conceptos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted-foreground px-3 py-4 text-center">
                    Sin otros conceptos.
                  </td>
                </tr>
              ) : (
                payload.otros_conceptos.map((o, i) => (
                  <tr key={`${o.pago_id}-${i}`} className="border-t">
                    <td className="px-3 py-2">{o.concepto}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{precioFmt.format(o.monto)}</td>
                    <td className="text-muted-foreground px-3 py-2 text-xs">{o.observaciones ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 space-y-2 border-t-2 border-stone-800 pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal ingresos</span>
          <span className="tabular-nums font-medium">{precioFmt.format(payload.subtotal_ingresos)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total alquileres (base comisión)</span>
          <span className="tabular-nums">{precioFmt.format(payload.total_alquileres)}</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span>Descuento comisión inmobiliaria</span>
          <span className="tabular-nums">− {precioFmt.format(payload.comision_monto)}</span>
        </div>
        <div className="flex justify-between pt-2 text-base font-bold">
          <span>Neto a rendir al propietario</span>
          <span className="tabular-nums">{precioFmt.format(payload.neto_a_rendir)}</span>
        </div>
      </section>
    </div>
  );
}
