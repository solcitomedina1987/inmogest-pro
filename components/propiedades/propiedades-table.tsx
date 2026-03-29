"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, ReceiptText, RotateCcw, Search, Trash2 } from "lucide-react";
import { deleteProperty } from "@/app/actions/propiedades";
import { ESTADO_PROPIEDAD_VALUES, TIPO_PROPIEDAD_VALUES } from "@/lib/constants/propiedades";
import { PropiedadEstadoBadge } from "@/lib/propiedades/estado-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropiedadFormDialog } from "@/components/propiedades/propiedad-form-dialog";
import { PropiedadVistaPreviaDialog } from "@/components/propiedades/propiedad-vista-previa-dialog";
import type { PersonaOption, PropiedadListRow } from "@/components/propiedades/types";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function labelTipo(t: string) {
  return t === "Departamento" ? "Depto" : t;
}

type Props = {
  rows: PropiedadListRow[];
  propietarios: PersonaOption[];
  clientes: PersonaOption[];
};

export function PropiedadesTable({ rows, propietarios, clientes }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PropiedadListRow | null>(null);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [vistaPreviaRow, setVistaPreviaRow] = useState<PropiedadListRow | null>(null);
  const [pending, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (nq && !r.nombre.toLowerCase().includes(nq)) {
        return false;
      }
      if (filtroTipo !== "todas" && r.tipo !== filtroTipo) {
        return false;
      }
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) {
        return false;
      }
      return true;
    });
  }, [rows, q, filtroTipo, filtroEstado]);

  function limpiarFiltros() {
    setQ("");
    setFiltroTipo("todas");
    setFiltroEstado("todos");
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: PropiedadListRow) {
    setEditing(row);
    setOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("¿Dar de baja esta propiedad? (baja lógica)")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteProperty(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  const cobrosTooltip = "Sin contrato de alquiler activo";

  return (
    <>
      <div className="flex max-w-full min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Propiedades</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inmuebles activos. Filtrá por nombre, tipo u operación; la columna Cobros enlaza al contrato si la
              propiedad está alquilada.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            Nueva propiedad
          </Button>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Listado</CardTitle>
                <CardDescription>
                  Solo registros con baja lógica activa. Los filtros se aplican al instante.
                </CardDescription>
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nombre de propiedad…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    aria-label="Buscar por nombre"
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-48">
                  <span className="text-muted-foreground text-xs font-medium">Tipo de propiedad</span>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectItem value="todas">Todas</SelectItem>
                      {TIPO_PROPIEDAD_VALUES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {labelTipo(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full space-y-1.5 sm:w-48">
                  <span className="text-muted-foreground text-xs font-medium">Tipo de operación</span>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectItem value="todos">Todos</SelectItem>
                      {ESTADO_PROPIEDAD_VALUES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 shrink-0 gap-2 border border-border bg-background"
                  onClick={limpiarFiltros}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Limpiar filtros
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No hay propiedades activas. Creá la primera con el botón superior.
              </p>
            ) : filtradas.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No hay propiedades que coincidan con los filtros.
                <Button type="button" variant="link" className="ml-1 h-auto p-0" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[72px] text-center">Ver</TableHead>
                      <TableHead className="w-[72px] text-center">Cobros</TableHead>
                      <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((row) => {
                      const cobrosActivo =
                        row.estado === "Alquilada" && row.contrato_cobranza_id != null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-[200px] font-medium">
                            <span className="line-clamp-2">{row.nombre}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {precioFmt.format(row.valor)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{labelTipo(row.tipo)}</Badge>
                          </TableCell>
                          <TableCell>
                            <PropiedadEstadoBadge estado={row.estado} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Vista previa: ${row.nombre}`}
                              onClick={() => {
                                setVistaPreviaRow(row);
                                setVistaPreviaOpen(true);
                              }}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            {cobrosActivo ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-primary"
                                asChild
                                aria-label={`Historial de cobros: ${row.nombre}`}
                              >
                                <Link href={`/dashboard/cobranzas/${row.contrato_cobranza_id}`}>
                                  <ReceiptText className="size-4" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="inline-flex" title={cobrosTooltip}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled
                                  className="pointer-events-none opacity-40"
                                  aria-label={cobrosTooltip}
                                >
                                  <ReceiptText className="size-4" />
                                </Button>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Editar"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                aria-label="Dar de baja"
                                disabled={pending}
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PropiedadFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        propietarios={propietarios}
        clientes={clientes}
      />

      <PropiedadVistaPreviaDialog
        open={vistaPreviaOpen}
        onOpenChange={(o) => {
          setVistaPreviaOpen(o);
          if (!o) {
            setVistaPreviaRow(null);
          }
        }}
        propiedad={vistaPreviaRow}
      />
    </>
  );
}
