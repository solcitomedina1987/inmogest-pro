import type { ContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { cn } from "@/lib/utils";

type Props = {
  data: ContratoLocacionPdfData;
  className?: string;
};

/**
 * Vista HTML estilo A4 (Tailwind) para impresión desde el navegador o vista previa.
 * Los datos deben coincidir con los usados en el PDF (react-pdf).
 */
export function ContractTemplate({ data, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto box-border min-h-[297mm] w-full max-w-[210mm] bg-white p-10 text-stone-900 shadow-sm print:shadow-none",
        "text-[11px] leading-relaxed print:p-8",
        className,
      )}
    >
      <header className="border-b border-stone-800 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Consultora Medina &amp; Asociados</h1>
        <p className="text-muted-foreground mt-1 text-xs">Contrato de locación — documento generado electrónicamente</p>
      </header>

      <h2 className="mt-6 text-center text-sm font-bold uppercase tracking-wide">
        Contrato de locación de inmueble
      </h2>

      <section className="mt-5 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Fecha del contrato</h3>
        <p>{data.fechaContratoFmt}</p>
      </section>

      <section className="mt-4 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Locador (propietario)</h3>
        <p>{data.propietarioLine}</p>
      </section>

      <section className="mt-4 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Locatario (inquilino)</h3>
        <p>{data.inquilinoLine}</p>
      </section>

      <section className="mt-4 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Inmueble</h3>
        <p>{data.propiedadDireccion}</p>
      </section>

      <section className="mt-4 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Características del inmueble</h3>
        <div className="rounded border border-stone-200 bg-stone-50 p-3 whitespace-pre-wrap">{data.caracteristicas}</div>
      </section>

      <section className="mt-4 space-y-1">
        <h3 className="text-xs font-semibold text-stone-700">Garantes y constancias</h3>
        <div className="rounded border border-stone-200 bg-stone-50 p-3 whitespace-pre-wrap">{data.datosGarantes}</div>
      </section>

      <section className="mt-4 space-y-2">
        <h3 className="text-xs font-semibold text-stone-700">Plazo y canon</h3>
        <p>
          Vigencia desde el <strong>{data.fechaInicioFmt}</strong> hasta el <strong>{data.fechaFinFmt}</strong>.
        </p>
        <p>
          Canon mensual: <strong>{data.valorMensualFmt}</strong>.
        </p>
        <p>
          Tipo de ajuste / índice acordado: <strong>{data.tipoAjuste}</strong>.
        </p>
      </section>

      <section className="mt-4 space-y-2">
        <h3 className="text-xs font-semibold text-stone-700">Cláusulas generales</h3>
        <p className="text-justify">
          Las partes declaran conocer y aceptar las condiciones de la Ley de Alquileres vigentes al momento de la
          firma. El presente documento resume los datos esenciales; las cláusulas particulares complementarias
          pueden constar en anexos firmados por las partes.
        </p>
      </section>

      <footer className="mt-10 border-t border-stone-200 pt-3 text-[10px] text-stone-500">
        Documento generado por el sistema interno. Las firmas manuscritas pueden agregarse en copia impresa.
      </footer>
    </div>
  );
}
