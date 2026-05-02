import { fechaEmisionReciboLiteral } from "@/lib/cobranzas/recibo-fecha";
import type { SeccionRecibo } from "@/lib/cobranzas/detalle-pago";
import { montoPesosArgentinosALetras } from "@/lib/cobranzas/monto-en-letras";

export type ReciboAlquilerProps = {
  numeroRecibo: string;
  nombreCliente: string;
  dniCliente: string;
  direccionInmueble: string;
  secciones: SeccionRecibo[];
  total: number;
  fechaEmision?: Date;
};

const precioTabla = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ReciboCopia({
  numeroRecibo,
  nombreCliente,
  dniCliente,
  direccionInmueble,
  secciones,
  total,
  totalLetras,
  dia,
  mesEmision,
  anio,
}: ReciboAlquilerProps & {
  totalLetras: string;
  dia: number;
  mesEmision: string;
  anio: number;
}) {
  return (
    <div className="recibo-copia flex flex-col text-black">
      <header className="recibo-copia-header mb-5 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- impresión fiable con asset público */}
        <img
          src="/img/logo.PNG"
          alt="Consultora Medina &amp; Asociados"
          className="recibo-logo h-14 w-auto max-w-[200px] object-contain"
          width={200}
          height={56}
        />
      </header>

      <h1 className="recibo-titulo mb-1 text-center text-lg font-bold leading-tight">
        Recibo {numeroRecibo}
      </h1>
      <p className="recibo-subtitulo mb-6 text-center text-xs font-normal text-neutral-700">
        no válido como factura
      </p>

      <section className="recibo-datos-pagador mb-5 space-y-1.5 text-sm leading-snug">
        <p>
          <span className="font-semibold">Pagador:</span> {nombreCliente}
        </p>
        <p>
          <span className="font-semibold">DNI:</span> {dniCliente}
        </p>
        <p>
          <span className="font-semibold">Domicilio del inmueble:</span> {direccionInmueble}
        </p>
        <p className="text-muted-foreground text-xs">
          San Luis, {dia} de {mesEmision} de {anio}
        </p>
      </section>

      <div className="space-y-5">
        {secciones.map((sec) => (
          <div key={sec.titulo}>
            <h2 className="mb-2 border-b border-neutral-600 pb-1 text-sm font-bold uppercase tracking-wide">
              {sec.titulo}
            </h2>
            <div className="recibo-tabla-wrap overflow-hidden rounded border border-neutral-800">
              <table className="recibo-tabla w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border-b border-neutral-800 px-2 py-2 text-left font-semibold">Concepto</th>
                    <th className="border-b border-neutral-800 px-2 py-2 text-right font-semibold">Monto</th>
                    <th className="border-b border-neutral-800 px-2 py-2 text-left font-semibold">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.lineas.map((row, i) => (
                    <tr key={`${sec.titulo}-${i}`} className="border-b border-neutral-300 last:border-b-0">
                      <td className="px-2 py-2 align-top">{row.concepto}</td>
                      <td className="px-2 py-2 text-right tabular-nums align-top">
                        {precioTabla.format(row.monto)}
                      </td>
                      <td className="text-muted-foreground px-2 py-2 align-top text-xs">
                        {row.observaciones ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="recibo-total mb-10 mt-4 space-y-1 border-t-2 border-neutral-800 pt-3 text-sm">
        <p className="flex justify-between font-bold">
          <span>Total a cobrar al inquilino</span>
          <span className="tabular-nums">{precioTabla.format(total)}</span>
        </p>
        <p className="text-xs leading-relaxed text-neutral-800">
          <span className="font-semibold">Son pesos:</span> {totalLetras}.
        </p>
      </div>

      <div className="recibo-margen-firma flex-shrink-0" aria-hidden />

      <div className="recibo-firma-dual mt-auto flex w-full gap-8 border-t border-transparent pt-2 text-xs">
        <div className="min-w-0 flex-1">
          <div className="recibo-linea-firma border-t border-black pt-1 text-center">Firma y Aclaración</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="recibo-linea-firma border-t border-black pt-1 text-center">Sello Inmobiliaria</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dos copias del recibo en una hoja, con zona de corte amplia para imprimir y cortar.
 */
export function ReciboAlquiler({
  numeroRecibo,
  nombreCliente,
  dniCliente,
  direccionInmueble,
  secciones,
  total,
  fechaEmision = new Date(),
}: ReciboAlquilerProps) {
  const { dia, mes: mesEmision, anio } = fechaEmisionReciboLiteral(fechaEmision);
  const totalLetras = montoPesosArgentinosALetras(total);
  const copiaProps = {
    numeroRecibo,
    nombreCliente,
    dniCliente,
    direccionInmueble,
    secciones,
    total,
    totalLetras,
    dia,
    mesEmision,
    anio,
  };

  return (
    <div
      id="recibo-alquiler-print-root"
      className="recibo-alquiler-print text-black antialiased"
      aria-hidden
    >
      <div className="recibo-hoja flex flex-col gap-0">
        <ReciboCopia {...copiaProps} />

        <div
          className="recibo-zona-corte flex w-full flex-shrink-0 flex-col items-stretch justify-center"
          aria-hidden
        >
          <div className="recibo-corte w-full border-t-2 border-dotted border-neutral-500 py-4 text-center text-xs font-medium text-neutral-600">
            Corte aquí — duplicado para la inmobiliaria / inquilino
          </div>
        </div>

        <ReciboCopia {...copiaProps} />
      </div>
    </div>
  );
}
