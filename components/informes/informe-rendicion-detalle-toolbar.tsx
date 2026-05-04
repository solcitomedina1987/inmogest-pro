"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Printer, Table } from "lucide-react";
import { toast } from "sonner";
import { sincronizarInformeRendicionGoogleSheets } from "@/app/actions/informes-rendicion-sheets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  informeId: string;
  deletedAt?: string | null;
  /** True si hay credenciales Google (misma service account que Calendar). */
  googleSheetsExportReady?: boolean;
};

export function InformeRendicionDetalleToolbar({ informeId, deletedAt, googleSheetsExportReady = false }: Props) {
  const [pendingSheets, startSheets] = useTransition();

  const syncSheets = () => {
    startSheets(() => {
      void (async () => {
        const r = await sincronizarInformeRendicionGoogleSheets(informeId);
        if (r.ok) {
          toast.success(`Datos exportados correctamente a la pestaña ${r.sheetTitle}`);
        } else {
          toast.error(r.error);
        }
      })();
    });
  };

  return (
    <div className="mb-6 flex max-w-full min-w-0 flex-col gap-3 print:hidden">
      {deletedAt ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
          )}
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Este informe está <strong>archivado</strong> (papelera). Podés seguir viendo el contenido y descargar el PDF.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/informes" className="gap-2">
            <ArrowLeft className="size-4" aria-hidden />
            Volver a rendiciones
          </Link>
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={() => window.print()}>
          Imprimir vista
        </Button>
        <Button size="sm" asChild>
          <a href={`/api/informes-rendicion/${informeId}/pdf`} target="_blank" rel="noopener noreferrer" className="gap-2">
            <Printer className="size-4" aria-hidden />
            Descargar PDF
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={Boolean(deletedAt) || !googleSheetsExportReady || pendingSheets}
          title={
            !googleSheetsExportReady
              ? "Configurá GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY y compartí la hoja con esa cuenta."
              : undefined
          }
          onClick={syncSheets}
        >
          {pendingSheets ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : <Table className="size-4 shrink-0" aria-hidden />}
          Sincronizar con Google Sheets
        </Button>
      </div>
    </div>
  );
}
