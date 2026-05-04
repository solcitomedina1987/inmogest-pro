import { ConceptoRendicionLucideIcon, conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-icons";
import {
  debeMostrarLineaComision,
  etiquetaComisionInmobiliaria,
  impactoLineaEffective,
  partesLineasUnidadV4,
} from "@/lib/informes/rendicion-v4-display";
import type { ConceptoRendicionKey, InformeRendicionPayloadV4, LineaRendicionUnidad } from "@/lib/informes/rendicion-types";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

type Props = { payload: InformeRendicionPayloadV4 };

function LineaMontoUnidad({
  conceptoKey,
  titulo,
  montoTexto,
  esNegativo,
  obs,
}: {
  conceptoKey: ConceptoRendicionKey;
  titulo: string;
  montoTexto: string;
  esNegativo: boolean;
  obs?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2 border-t border-stone-100 py-2 first:border-t-0 first:pt-0">
      <div className="mt-0.5 shrink-0">
        <ConceptoRendicionLucideIcon conceptoKey={conceptoKey} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-900">{titulo}</p>
        {obs?.trim() ? <p className="text-muted-foreground mt-0.5 text-xs">{obs.trim()}</p> : null}
      </div>
      <p
        className={`shrink-0 text-right text-sm tabular-nums font-medium ${
          esNegativo ? "text-destructive" : "text-stone-900"
        }`}
      >
        {montoTexto}
      </p>
    </div>
  );
}

function BloqueUnidadAlquileres({ payload, u }: { payload: InformeRendicionPayloadV4; u: InformeRendicionPayloadV4["unidades"][number] }) {
  const { lineaAlquiler, resto } = partesLineasUnidadV4(u);
  const showComision = debeMostrarLineaComision(payload, u);
  const alqFmt = precioFmt.format(u.monto_alquiler);

  const lineaConceptoEl = (row: LineaRendicionUnidad, keySuffix: string) => {
    const imp = impactoLineaEffective(row);
    const esResta = imp === "propietario_resta";
    const montoAbs = precioFmt.format(row.monto);
    const montoTexto = esResta ? `−${montoAbs}` : montoAbs;
    return (
      <LineaMontoUnidad
        key={`${u.pago_id}-${keySuffix}`}
        conceptoKey={conceptoRendicionKeyDesdeLinea(row)}
        titulo={row.concepto}
        montoTexto={montoTexto}
        esNegativo={esResta}
        obs={row.observaciones}
      />
    );
  };

  return (
    <div className="bg-white px-4 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug text-stone-900">{u.titulo_bloque}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">Recibo {u.pago_id.slice(0, 8)}…</span>
      </div>

      <div className="rounded-md border border-stone-200 bg-stone-50/40 px-3 py-2">
        {lineaAlquiler ? lineaConceptoEl(lineaAlquiler, "alq") : null}

        {showComision ? (
          <LineaMontoUnidad
            key={`${u.pago_id}-com`}
            conceptoKey="honorarios_inmobiliarios"
            titulo={etiquetaComisionInmobiliaria(payload.comision_porcentaje, alqFmt)}
            montoTexto={`−${precioFmt.format(u.comision_inmobiliaria_unidad)}`}
            esNegativo
          />
        ) : null}

        {resto.map((row, i) => lineaConceptoEl(row, `ex-${i}`))}

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-300 pt-3">
          <span className="text-sm font-bold text-stone-950">Subtotal al propietario</span>
          <span className="text-sm font-bold tabular-nums text-stone-950">{precioFmt.format(u.subtotal_neto_unidad)}</span>
        </div>
      </div>
    </div>
  );
}

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
                <BloqueUnidadAlquileres key={u.pago_id} payload={payload} u={u} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 overflow-hidden rounded-lg border-2 border-dashed border-stone-400 bg-slate-50/50 shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">Rendición a Inmobiliaria</h2>
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

        <div className="mt-4 border-t-2 border-stone-300 px-4 pb-5 pt-4">
          <div className="rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-stone-950 sm:text-xl">
                Total general inmobiliaria
              </span>
              <span className="shrink-0 text-2xl font-extrabold tabular-nums text-stone-950 sm:text-right sm:text-3xl">
                {precioFmt.format(payload.total_suma_inmobiliaria_conceptos)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mt-10 rounded-xl border-2 border-stone-900 bg-gradient-to-b from-stone-50 to-stone-100 p-6 shadow-lg print:border-stone-900"
        aria-label="Liquidación final"
      >
        <h3 className="text-center text-xs font-bold uppercase tracking-widest text-stone-600">Liquidación final</h3>
        <div className="mt-5 space-y-3 text-sm">
          {payload.unidades.map((u) => (
            <div
              key={`liq-${u.pago_id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stone-200 pb-2 last:border-b-0 last:pb-0"
            >
              <span className="min-w-0 max-w-[85%] text-sm font-medium text-stone-800">{u.titulo_bloque}</span>
              <span className="shrink-0 font-semibold tabular-nums text-stone-900">{precioFmt.format(u.subtotal_neto_unidad)}</span>
            </div>
          ))}
          {!validacionOk ? (
            <p className="text-destructive pt-1 text-xs font-medium">
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
