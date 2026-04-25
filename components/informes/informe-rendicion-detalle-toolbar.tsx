"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  informeId: string;
};

export function InformeRendicionDetalleToolbar({ informeId }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
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
  );
}
