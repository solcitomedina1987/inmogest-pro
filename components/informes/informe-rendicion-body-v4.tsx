import { ConceptoRendicionLucideIcon, conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-icons";
import type { InformeRendicionPayloadV4 } from "@/lib/informes/rendicion-types";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

type Props = { payload: InformeRendicionPayloadV4 };

export function InformeRendicionBodyV4({ payload }: Props) {
  const validacionOk =
    Math.abs(payload.total_validacion_neto - payload.total_a_rendir_propietario) < 0.02;

  return (
    <>
      <section className="mt-8 space-y-6">
        <div className="overflow-hidden rounded-lg border-2 border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-amber-50/60 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-900">Rendición de Alquileres</h2>
          </div>

          {payload.unidades.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">Sin cobranzas registradas en el período.</p>
          ) : (
            <div className="divide-y divide-stone-200">
              {payload.unidades.map((u) => (
                <div key={u.pago_id} className="bg-white px-4 py-4">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-stone-900">{u.titulo_bloque}</h3>
                    <span className="text-muted-foreground text-xs tabular-nums">Recibo {u.pago_id.slice(0, 8)}…</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="w-10 px-1 py-1.5" aria-hidden />
                        <th className="px-2 py-1.5 text-left font-medium">Concepto</th>
                        <th className="px-2 py-1.5 text-right font-medium">Monto</th>
                        <th className="px-2 py-1.5 text-left font-medium">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.lineas.map((row, i) => (
                        <tr key={`${u.pago_id}-${i}`} className="border-t border-stone-100">
                          <td className="px-1 py-1.5 align-middle">
                            <ConceptoRendicionLucideIcon conceptoKey={conceptoRendicionKeyDesdeLinea(row)} />
                          </td>
                          <td className="px-2 py-1.5">{row.concepto}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{precioFmt.format(row.monto)}</td>
                          <td className="text-muted-foreground px-2 py-1.5 text-xs">{row.observaciones ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 space-y-1.5 rounded-md border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-stone-700">Subtotal bruto (alquiler + suma al propietario)</span>
                      <span className="tabular-nums font-medium text-stone-900">{precioFmt.format(u.subtotal_bruto)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-destructive">
                      <span>
                        Comisión inmobiliaria ({payload.comision_porcentaje}% sobre alquiler{" "}
                        {precioFmt.format(u.monto_alquiler)})
                      </span>
                      <span className="tabular-nums font-medium">− {precioFmt.format(u.comision_inmobiliaria_unidad)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-destructive">
                      <span>Deducciones (resta al propietario)</span>
                      <span className="tabular-nums font-medium">− {precioFmt.format(u.deducciones)}</span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap justify-between gap-2 border-t border-stone-200 pt-1.5 text-xs">
                      <span>Total cobrado al inquilino (recibo)</span>
                      <span className="tabular-nums">{precioFmt.format(u.subtotal_cobrado_inquilino)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-stone-300 pt-2">
                      <span className="font-bold text-stone-950">Subtotal neto unidad</span>
                      <span className="font-bold tabular-nums text-stone-950">{precioFmt.format(u.subtotal_neto_unidad)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 overflow-hidden rounded-lg border-2 border-dashed border-stone-400 bg-slate-50/50 shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">Rendición a Inmobiliaria</h2>
          <p className="text-muted-foreground mt-1 text-xs">Conceptos con impacto inmobiliaria, agrupados por unidad.</p>
        </div>

        {payload.inmobiliaria_por_unidad.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">Sin conceptos inmobiliaria en el período.</p>
        ) : (
          <div className="divide-y divide-stone-200">
            {payload.inmobiliaria_por_unidad.map((bloque) => (
              <div key={bloque.pago_id} className="bg-white px-4 py-3">
                <h3 className="mb-2 text-sm font-bold text-stone-900">{bloque.titulo_bloque}</h3>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="w-10 px-1 py-1.5" aria-hidden />
                      <th className="px-2 py-1.5 text-left font-medium">Concepto</th>
                      <th className="px-2 py-1.5 text-right font-medium">Monto</th>
                      <th className="px-2 py-1.5 text-left font-medium">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.items.map((o, i) => (
                      <tr key={`${bloque.pago_id}-im-${i}`} className="border-t border-stone-100">
                        <td className="px-1 py-1.5 align-middle">
                          <ConceptoRendicionLucideIcon
                            conceptoKey={conceptoRendicionKeyDesdeLinea({
                              concepto: o.concepto,
                              concepto_key: o.concepto_key ?? null,
                            })}
                          />
                        </td>
                        <td className="px-2 py-1.5">{o.concepto}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{precioFmt.format(o.monto)}</td>
                        <td className="text-muted-foreground px-2 py-1.5 text-xs">{o.observaciones ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex justify-between gap-2 rounded-md border border-stone-200 bg-slate-100/80 px-3 py-2 text-sm font-semibold text-stone-900">
                  <span>Subtotal inmobiliaria (unidad)</span>
                  <span className="tabular-nums">{precioFmt.format(bloque.subtotal_unidad)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-stone-300 bg-slate-100/90 px-4 py-2.5 text-sm">
          <div className="flex justify-between gap-4 font-bold text-stone-950">
            <span>Total general inmobiliaria</span>
            <span className="tabular-nums">{precioFmt.format(payload.total_suma_inmobiliaria_conceptos)}</span>
          </div>
        </div>
      </section>

      <section
        className="mt-10 rounded-xl border-2 border-stone-900 bg-gradient-to-b from-stone-50 to-stone-100 p-6 shadow-lg print:border-stone-900"
        aria-label="Liquidación final"
      >
        <h3 className="text-center text-xs font-bold uppercase tracking-widest text-stone-600">Liquidación final</h3>
        <div className="mt-5 space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-stone-300 pb-2">
            <span className="min-w-0 flex-1 font-medium text-stone-800">Subtotal propiedades</span>
            <span className="shrink-0 font-semibold tabular-nums text-stone-900 sm:text-right">
              {precioFmt.format(payload.total_subtotal_bruto_periodo)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-destructive">
            <span className="min-w-0 flex-1 font-medium">Comisiones (suma por unidad, sobre alquiler)</span>
            <span className="shrink-0 font-semibold tabular-nums sm:text-right">
              − {precioFmt.format(payload.total_comisiones_periodo)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-destructive">
            <span className="min-w-0 flex-1 font-medium">Deducciones (resta al propietario)</span>
            <span className="shrink-0 font-semibold tabular-nums sm:text-right">
              − {precioFmt.format(payload.total_deducciones_periodo)}
            </span>
          </div>
          {!validacionOk ? (
            <p className="text-destructive text-xs font-medium">
              Atención: diferencia de redondeo entre el total liquidado y el detalle por unidad. Revisá los importes en el
              sistema.
            </p>
          ) : null}
          <div className="rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-stone-950 sm:text-xl">
                Total al propietario
              </span>
              <span className="shrink-0 text-2xl font-extrabold tabular-nums text-stone-950 sm:text-right sm:text-3xl">
                {precioFmt.format(payload.total_a_rendir_propietario)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
