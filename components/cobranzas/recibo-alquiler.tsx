import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/constants/branding";
import {
  fechaEmisionReciboLiteral,
  formatoMontoReciboPesos,
  mesPeriodoALiteral,
} from "@/lib/cobranzas/recibo-fecha";
import { montoPesosEnLetras } from "@/lib/cobranzas/monto-en-letras";

export type ReciboAlquilerProps = {
  nombreCliente: string;
  montoPagado: number;
  mesPeriodo: string;
  /** Dirección del inmueble (desde datos de la propiedad). */
  direccionPropiedad: string;
  /** Fecha de emisión que figura en el recibo (p. ej. fecha del pago). */
  fechaEmision?: Date;
  /** Texto del concepto (alquiler, expensas, etc.). */
  concepto?: string;
  /** Número correlativo o placeholder hasta asignar. */
  numeroRecibo?: string;
  /** Leyenda bajo la firma del locador (opcional). */
  nombreLocador?: string;
};

const fechaCortaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function ReciboCopia({
  nombreCliente,
  montoNumero,
  montoLetras,
  mesAlquilerLiteral,
  fechaEmisionDisplay,
  dia,
  mesEmision,
  anio,
  direccionPropiedad,
  concepto,
  numeroRecibo,
  nombreLocador,
  etiquetaCopia,
}: {
  nombreCliente: string;
  montoNumero: string;
  montoLetras: string;
  mesAlquilerLiteral: string;
  fechaEmisionDisplay: string;
  dia: number;
  mesEmision: string;
  anio: number;
  direccionPropiedad: string;
  concepto: string;
  numeroRecibo: string;
  nombreLocador?: string;
  etiquetaCopia: string;
}) {
  return (
    <article
      className="recibo-copia recibo-copia-boho mx-auto flex w-full max-w-[148mm] flex-col bg-[#faf9f6] px-6 py-7 text-stone-800 shadow-none print:mx-0 print:max-w-none print:bg-white print:px-0 print:py-0 print:shadow-none"
      aria-label={`Recibo de alquiler, ${etiquetaCopia}`}
    >
      <div className="recibo-marco flex min-h-0 flex-1 flex-col border border-stone-300/90 bg-[#faf9f6] px-5 py-6 print:border-stone-400 print:bg-white">
        <header className="recibo-copia-header mb-5 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start print:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- impresión fiable con URL pública */}
            <img
              src={BRAND_LOGO_SRC}
              alt={BRAND_NAME}
              className="recibo-logo h-12 w-auto max-w-[200px] object-contain object-left sm:h-[3.25rem] print:h-[3rem] print:max-w-[180px]"
              width={200}
              height={64}
            />
            <p className="recibo-marca text-center text-[0.65rem] font-medium uppercase tracking-[0.2em] text-stone-500 sm:text-left print:text-left">
              {BRAND_NAME}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right print:items-end print:text-right">
            <p className="font-[family-name:var(--font-recibo-serif),Georgia,serif] text-lg font-semibold tracking-tight text-stone-900">
              Recibo de pago
            </p>
            <p className="text-[0.7rem] text-stone-500">Documento no válido como factura</p>
            <p className="mt-1 rounded-sm border border-stone-200 bg-stone-100/80 px-2.5 py-1 font-mono text-xs text-stone-700 print:bg-stone-50">
              Recibo N.º <span className="font-semibold">{numeroRecibo}</span>
            </p>
            <p className="text-[0.65rem] uppercase tracking-wide text-stone-400">{etiquetaCopia}</p>
          </div>
        </header>

        <h1 className="recibo-titulo mb-4 text-center font-[family-name:var(--font-recibo-serif),Georgia,serif] text-xl font-semibold text-stone-900 sm:text-2xl print:text-[1.35rem]">
          Alquiler
        </h1>

        <dl className="recibo-cuerpo mb-5 grid gap-3 text-sm sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3 print:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="font-sans text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">
              Inquilino
            </dt>
            <dd className="mt-0.5 border-b border-dotted border-stone-300 pb-1 font-sans text-base text-stone-900">
              {nombreCliente}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">
              Fecha de emisión
            </dt>
            <dd className="mt-0.5 border-b border-dotted border-stone-300 pb-1 font-sans text-stone-900">
              {fechaEmisionDisplay}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">
              Período cancelado
            </dt>
            <dd className="mt-0.5 border-b border-dotted border-stone-300 pb-1 font-sans capitalize text-stone-900">
              {mesAlquilerLiteral}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-sans text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">
              Inmueble
            </dt>
            <dd className="mt-0.5 border-b border-dotted border-stone-300 pb-1 font-sans text-stone-900">
              {direccionPropiedad}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-sans text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">
              Concepto
            </dt>
            <dd className="mt-0.5 border-b border-dotted border-stone-300 pb-1 font-sans text-stone-900">
              {concepto}
            </dd>
          </div>
        </dl>

        <div className="mb-5 rounded-md border border-stone-200 bg-stone-100/40 px-4 py-3 print:bg-stone-50">
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-stone-500">Importe</p>
          <p className="mt-1 font-[family-name:var(--font-recibo-serif),Georgia,serif] text-2xl font-semibold text-stone-900 sm:text-3xl print:text-[1.65rem]">
            <span className="text-lg font-normal text-stone-600">$</span> {montoNumero}
          </p>
          <p className="recibo-monto-letras mt-3 border-t border-stone-200/90 pt-3 font-sans text-sm leading-relaxed text-stone-700">
            Son <span className="italic text-stone-800">{montoLetras}</span>.
          </p>
        </div>

        <p className="recibo-texto-legal mb-6 border-l-2 border-stone-300 pl-3 font-sans text-xs leading-relaxed text-stone-600">
          En San Luis, a los {dia} días del mes de {mesEmision} de {anio}, se extiende el presente en
          conformidad con el pago recibido. Conserve este comprobante.
        </p>

        <div className="recibo-firmas mt-auto border-t border-stone-200 pt-5">
          <div className="mx-auto max-w-xs">
            <div className="recibo-linea-firma h-px w-full bg-stone-400" />
            <p className="mt-2 text-center font-sans text-xs text-stone-600">
              Firma y aclaración
              <br />
              <span className="text-[0.65rem] text-stone-500">Locador / Administrador</span>
              {nombreLocador ? (
                <>
                  <br />
                  <span className="text-[0.7rem] font-medium text-stone-700">{nombreLocador}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Recibo imprimible (A5). Dos copias con línea de corte.
 * En pantalla permanece fuera de vista; al imprimir, añadir `print-receipt-only` en `html`.
 */
export function ReciboAlquiler({
  nombreCliente,
  montoPagado,
  mesPeriodo,
  direccionPropiedad,
  fechaEmision = new Date(),
  concepto = "Pago de alquiler mensual",
  numeroRecibo = "_____",
  nombreLocador,
}: ReciboAlquilerProps) {
  const { dia, mes: mesEmision, anio } = fechaEmisionReciboLiteral(fechaEmision);
  const montoNumero = formatoMontoReciboPesos(montoPagado);
  const montoLetras = montoPesosEnLetras(montoPagado);
  const mesAlquilerLiteral = mesPeriodoALiteral(mesPeriodo);
  const fechaEmisionDisplay = fechaCortaFmt.format(fechaEmision);

  return (
    <div
      id="recibo-alquiler-print-root"
      className="recibo-alquiler-print text-stone-900 antialiased"
      aria-hidden
    >
      <div className="recibo-hoja flex flex-col gap-8 print:gap-0">
        <ReciboCopia
          nombreCliente={nombreCliente}
          montoNumero={montoNumero}
          montoLetras={montoLetras}
          mesAlquilerLiteral={mesAlquilerLiteral}
          fechaEmisionDisplay={fechaEmisionDisplay}
          dia={dia}
          mesEmision={mesEmision}
          anio={anio}
          direccionPropiedad={direccionPropiedad}
          concepto={concepto}
          numeroRecibo={numeroRecibo}
          nombreLocador={nombreLocador}
          etiquetaCopia="Original — Inquilino"
        />

        <div
          className="recibo-zona-corte flex w-full flex-shrink-0 flex-col items-center justify-center py-2 print:py-4"
          aria-hidden
        >
          <div className="recibo-corte w-full max-w-[148mm] border-t border-dashed border-stone-400 print:max-w-none" />
          <p className="recibo-corte mt-2 text-center font-sans text-[0.65rem] uppercase tracking-widest text-stone-400">
            Duplicado — archivo consultora
          </p>
        </div>

        <ReciboCopia
          nombreCliente={nombreCliente}
          montoNumero={montoNumero}
          montoLetras={montoLetras}
          mesAlquilerLiteral={mesAlquilerLiteral}
          fechaEmisionDisplay={fechaEmisionDisplay}
          dia={dia}
          mesEmision={mesEmision}
          anio={anio}
          direccionPropiedad={direccionPropiedad}
          concepto={concepto}
          numeroRecibo={numeroRecibo}
          nombreLocador={nombreLocador}
          etiquetaCopia="Duplicado — archivo"
        />
      </div>
    </div>
  );
}
