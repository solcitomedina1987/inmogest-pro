import type { ContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { cn } from "@/lib/utils";

type Props = {
  data: ContratoLocacionPdfData;
  className?: string;
};

/**
 * Vista HTML estilo A4 (Tailwind) para impresión; mismo texto que el PDF.
 */
export function ContractTemplate({ data, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto box-border min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-stone-900 shadow-sm print:shadow-none",
        "text-[9px] leading-snug print:p-6 sm:text-[10px] sm:leading-normal",
        className,
      )}
    >
      <header className="border-b border-stone-800 pb-2">
        <h1 className="text-sm font-semibold tracking-tight">Consultora Medina &amp; Asociados</h1>
        <p className="text-muted-foreground mt-0.5 text-[10px]">
          Contrato de locación — documento generado electrónicamente
        </p>
      </header>

      <article className="mt-4 whitespace-pre-wrap text-justify">{data.bodyText}</article>

      <footer className="mt-6 border-t border-stone-200 pt-2 text-[9px] text-stone-500">
        Documento generado por el sistema interno. Las firmas manuscritas y la legalización notarial se completan en
        copia impresa.
      </footer>
    </div>
  );
}
