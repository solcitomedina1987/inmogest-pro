"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, FileText, Printer } from "lucide-react";
import type { InformeRendicionListRow } from "@/lib/informes/rendicion-types";
import { NuevoInformeDialog, type PropietarioOption } from "@/components/informes/nuevo-informe-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

type Props = {
  rows: InformeRendicionListRow[];
  propietarios: PropietarioOption[];
};

export function InformesRendicionClient({ rows, propietarios }: Props) {
  const [nuevoOpen, setNuevoOpen] = useState(false);

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Informes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rendiciones de cobranzas a propietarios. Los importes quedan congelados en el historial.
          </p>
        </div>
        <Button type="button" onClick={() => setNuevoOpen(true)}>
          Nuevo informe
        </Button>
      </div>

      <NuevoInformeDialog open={nuevoOpen} onOpenChange={setNuevoOpen} propietarios={propietarios} />

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Historial</CardTitle>
          <CardDescription>{rows.length} informe(s) generados.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Aún no hay informes. Creá el primero con &quot;Nuevo informe&quot;.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Monto total</TableHead>
                    <TableHead>Fecha de generación</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.propietario_nombre ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{precioFmt.format(r.monto_total)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {fechaFmt.format(new Date(r.fecha_generacion))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild aria-label="Ver detalle">
                          <Link href={`/dashboard/informes/${r.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild aria-label="Descargar PDF">
                          <a href={`/api/informes-rendicion/${r.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Printer className="size-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <FileText className="size-3.5 shrink-0" aria-hidden />
        El PDF replica el contenido guardado al momento de la generación.
      </p>
    </div>
  );
}
