"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  informeId: string;
  deletedAt?: string | null;
};

export function InformeRendicionDetalleToolbar({ informeId, deletedAt }: Props) {
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
      </div>
    </div>
  );
}
