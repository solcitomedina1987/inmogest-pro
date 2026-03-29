import {
  fechaEmisionReciboLiteral,
  formatoMontoReciboPesos,
  mesPeriodoALiteral,
} from "@/lib/cobranzas/recibo-fecha";

export type ReciboAlquilerProps = {
  nombreCliente: string;
  montoPagado: number;
  mesPeriodo: string;
  /** Fecha del texto “En la ciudad de San Luis, a los…” (por defecto hoy). */
  fechaEmision?: Date;
};

function ReciboCopia({
  nombreCliente,
  montoTexto,
  mesAlquilerLiteral,
  dia,
  mesEmision,
  anio,
}: {
  nombreCliente: string;
  montoTexto: string;
  mesAlquilerLiteral: string;
  dia: number;
  mesEmision: string;
  anio: number;
}) {
  return (
    <div className="recibo-copia flex flex-col">
      <header className="recibo-copia-header mb-4 flex items-start justify-end">
        {/* eslint-disable-next-line @next/next/no-img-element -- impresión fiable con URL pública */}
        <img
          src="/img/logo.PNG"
          alt=""
          className="recibo-logo h-11 w-auto max-w-[160px] object-contain object-right"
          width={160}
          height={48}
        />
      </header>

      <h1 className="recibo-titulo mb-5 text-center text-base font-bold leading-snug text-black">
        Recibo de Alquiler (no válido como factura)
      </h1>

      <p className="recibo-cuerpo mb-10 text-justify text-sm leading-relaxed text-black">
        En la ciudad de San Luis, a los {dia} días del mes de {mesEmision} del año {anio}, recibí de{" "}
        {nombreCliente}, la suma de ${montoTexto}, por el pago de Alquiler del mes de {mesAlquilerLiteral}.
      </p>

      <div className="recibo-firmas mt-auto space-y-8 pt-4">
        <div>
          <div className="recibo-linea-firma border-t border-black" />
          <p className="mt-1 text-center text-xs text-black">Firma y Aclaración</p>
        </div>
        <div>
          <div className="recibo-linea-firma border-t border-black" />
          <p className="mt-1 text-center text-xs text-black">Sello de la Inmobiliaria</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Contenido del recibo para impresión: dos copias idénticas en A4.
 * En pantalla debe permanecer fuera de vista; al imprimir, usar clase `print-receipt-only` en `html`.
 */
export function ReciboAlquiler({
  nombreCliente,
  montoPagado,
  mesPeriodo,
  fechaEmision = new Date(),
}: ReciboAlquilerProps) {
  const { dia, mes: mesEmision, anio } = fechaEmisionReciboLiteral(fechaEmision);
  const montoTexto = formatoMontoReciboPesos(montoPagado);
  const mesAlquilerLiteral = mesPeriodoALiteral(mesPeriodo);

  return (
    <div
      id="recibo-alquiler-print-root"
      className="recibo-alquiler-print text-black antialiased"
      aria-hidden
    >
      <div className="recibo-hoja flex flex-col">
        <ReciboCopia
          nombreCliente={nombreCliente}
          montoTexto={montoTexto}
          mesAlquilerLiteral={mesAlquilerLiteral}
          dia={dia}
          mesEmision={mesEmision}
          anio={anio}
        />

        <div
          className="recibo-zona-corte flex min-h-[6.75rem] w-full flex-shrink-0 flex-col items-stretch justify-center"
          aria-hidden
        >
          <div className="recibo-corte w-full border-t-2 border-dotted border-neutral-600 py-2 text-center text-xs font-medium text-neutral-700">
            Corte aquí - Duplicado para Inmobiliaria
          </div>
        </div>

        <ReciboCopia
          nombreCliente={nombreCliente}
          montoTexto={montoTexto}
          mesAlquilerLiteral={mesAlquilerLiteral}
          dia={dia}
          mesEmision={mesEmision}
          anio={anio}
        />
      </div>
    </div>
  );
}
