import type { InformeRendicionPayload } from "@/lib/informes/rendicion-types";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

type Props = {
  payload: InformeRendicionPayload;
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
          <span className="font-medium text-foreground">Comisión sobre alquileres:</span>{" "}
          {payload.comision_porcentaje}%
        </p>
      </div>

      {payload.v === 2 ? (
        <>
          {/* Bloque A: solo comisión aquí */}
          <section className="mt-8 overflow-hidden rounded-lg border-2 border-stone-300 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-amber-50/60 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-stone-900">Rendición de Alquileres</h2>
                <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
                  Comisionable
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Ingresos registrados como <strong className="text-foreground">Alquiler</strong>. La comisión aplica
                únicamente a este bloque.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Propiedad</th>
                  <th className="px-3 py-2 text-left font-medium">Concepto</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payload.alquileres.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted-foreground px-3 py-4 text-center">
                      Sin alquileres cobrados en el período.
                    </td>
                  </tr>
                ) : (
                  payload.alquileres.map((a) => (
                    <tr key={a.pago_id} className="border-t border-stone-200">
                      <td className="px-3 py-2">{a.etiqueta}</td>
                      <td className="px-3 py-2">Alquiler</td>
                      <td className="px-3 py-2 text-right tabular-nums">{precioFmt.format(a.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="space-y-2 border-t-2 border-stone-500 bg-stone-100/90 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-900">Subtotal Alquileres</span>
                <span className="font-bold tabular-nums text-stone-900">
                  {precioFmt.format(payload.total_alquileres_cobrados)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-destructive">
                <span>Comisión Inmobiliaria ({payload.comision_porcentaje}%)</span>
                <span className="tabular-nums">− {precioFmt.format(payload.comision_monto)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-stone-400 pt-2">
                <span className="font-bold text-stone-900">Subtotal Neto de Alquileres</span>
                <span className="font-bold tabular-nums text-stone-900">
                  {precioFmt.format(payload.neto_alquileres)}
                </span>
              </div>
            </div>
          </section>

          {/* Divisor entre flujos de dinero */}
          <div
            className="my-10 h-0 border-t-4 border-double border-stone-700 print:my-8"
            role="separator"
            aria-label="Separación: comisión solo sobre alquileres"
          />

          {/* Bloque B: informativo */}
          <section className="overflow-hidden rounded-lg border-2 border-stone-300 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-stone-900">Detalle de Servicios y Otros Conceptos</h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                  Informativo
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Luz, gas, agua, expensas y demás rubros del recibo. Sin descuentos ni comisión sobre este bloque.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
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
                      Sin otros conceptos en el período.
                    </td>
                  </tr>
                ) : (
                  payload.otros_conceptos.map((o, i) => (
                    <tr key={`${o.pago_id}-${i}`} className="border-t border-stone-200">
                      <td className="px-3 py-2">{o.concepto}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{precioFmt.format(o.monto)}</td>
                      <td className="text-muted-foreground px-3 py-2 text-xs">{o.observaciones ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-t-2 border-stone-500 bg-slate-100/90 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-900">Subtotal Otros Conceptos</span>
                <span className="font-bold tabular-nums text-stone-900">
                  {precioFmt.format(payload.subtotal_otros_conceptos)}
                </span>
              </div>
            </div>
          </section>

          {/* Liquidación final */}
          <section
            className="mt-10 rounded-lg border-2 border-stone-900 bg-stone-50 p-5 shadow-inner print:border-stone-900"
            aria-label="Liquidación final"
          >
            <h3 className="text-center text-xs font-bold uppercase tracking-widest text-stone-700">
              Liquidación final
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="font-bold text-stone-900">Subtotal Neto de Alquileres</span>
                <span className="font-bold tabular-nums text-stone-900">
                  {precioFmt.format(payload.neto_alquileres)}
                </span>
              </div>
              <p className="text-center text-lg font-light text-stone-500">+</p>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="font-bold text-stone-900">Subtotal Otros Conceptos</span>
                <span className="font-bold tabular-nums text-stone-900">
                  {precioFmt.format(payload.subtotal_otros_conceptos)}
                </span>
              </div>
              <div className="border-t-2 border-stone-800 pt-3" />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-base">
                <span className="font-bold tracking-tight text-stone-950">TOTAL NETO A RENDIR AL DUEÑO</span>
                <span className="font-bold tabular-nums text-stone-950">
                  {precioFmt.format(payload.total_neto_a_rendir)}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-center text-xs leading-relaxed">
              Subtotal Neto de Alquileres + Subtotal Otros Conceptos = importe total a entregar al propietario.
            </p>
          </section>
        </>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-base font-semibold">Alquileres cobrados (informe histórico)</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Formato anterior del sistema. Los importes reflejan el cálculo vigente al momento de la generación.
            </p>
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
        </>
      )}

      <footer className="mt-14 border-t border-stone-300 pt-10 print:mt-12 print:pt-8">
        <p className="text-muted-foreground mb-16 text-center text-xs">Firma y aclaración del propietario / la propietaria</p>
        <div className="mx-auto max-w-md border-b border-stone-400" />
      </footer>
    </div>
  );
}
