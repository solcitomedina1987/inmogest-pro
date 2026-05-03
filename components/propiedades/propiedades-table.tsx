"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Home, Loader2, MessageCircle, Pencil, ReceiptText, RotateCcw, Search, Trash2 } from "lucide-react";
import { deleteProperty } from "@/app/actions/propiedades";
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

function waLink(telefono: string): string {
  const clean = telefono.replace(/[\s\-().+]/g, "");
  const num = clean.startsWith("54") ? clean : clean.startsWith("0") ? `549${clean.slice(1)}` : `549${clean}`;
  return `https://wa.me/${num}`;
}

function labelTipo(t: string) {
  return t === "Departamento" ? "Depto" : t;
}

type Props = {
  rows: PropiedadListRow[];
  propietarios: PersonaOption[];
  tiposCatalogo: string[];
  estadosCatalogo: string[];
  children?: ReactNode;
};

export function PropiedadesTable({ rows, propietarios, tiposCatalogo, estadosCatalogo, children }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ciudadQ, setCiudadQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PropiedadListRow | null>(null);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [vistaPreviaRow, setVistaPreviaRow] = useState<PropiedadListRow | null>(null);
  const [navigatingCobrosId, setNavigatingCobrosId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tiposFiltroOpciones = useMemo(() => {
    const s = new Set(tiposCatalogo);
    for (const r of rows) s.add(r.tipo);
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [tiposCatalogo, rows]);

  const estadosFiltroOpciones = useMemo(() => {
    const s = new Set(estadosCatalogo);
    for (const r of rows) s.add(r.estado);
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [estadosCatalogo, rows]);

  const filtradas = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const cq = ciudadQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (nq && !r.nombre.toLowerCase().includes(nq)) {
        return false;
      }
      if (cq) {
        const city = (r.ciudad ?? "").trim().toLowerCase();
        if (!city.includes(cq)) {
          return false;
        }
      }
      if (filtroTipo !== "todas" && r.tipo !== filtroTipo) {
        return false;
      }
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) {
        return false;
      }
      return true;
    });
  }, [rows, q, ciudadQ, filtroTipo, filtroEstado]);

  function limpiarFiltros() {
    setQ("");
    setCiudadQ("");
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
        <header className="flex max-w-full flex-row items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Propiedades</h1>
          <Button type="button" className="shrink-0 gap-2" onClick={openCreate}>
            <Home className="size-4" aria-hidden />
            Nueva propiedad
          </Button>
        </header>

        {children ? <div className="flex flex-col gap-8">{children}</div> : null}

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
                <div className="relative min-w-[180px] flex-1 sm:max-w-[220px]">
                  <Input
                    placeholder="Filtrar por ciudad…"
                    value={ciudadQ}
                    onChange={(e) => setCiudadQ(e.target.value)}
                    aria-label="Filtrar por ciudad"
                    autoComplete="off"
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
                      {tiposFiltroOpciones.map((t) => (
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
                      {estadosFiltroOpciones.map((e) => (
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
                      <TableHead className="min-w-[9rem]">Inquilino</TableHead>
                      <TableHead className="min-w-[7rem]">Tel. inquilino</TableHead>
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
                          <TableCell className="text-sm">
                            {row.estado === "Alquilada"
                              ? row.inquilino_nombre ?? (
                                  <span className="text-muted-foreground">—</span>
                                )
                              : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {row.estado === "Alquilada" && row.inquilino_telefono ? (
                              <a
                                href={waLink(row.inquilino_telefono)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-green-700 hover:text-green-900 hover:underline dark:text-green-400"
                              >
                                <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                                {row.inquilino_telefono}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-primary"
                                aria-label={`Historial de cobros: ${row.nombre}`}
                                disabled={navigatingCobrosId === row.contrato_cobranza_id}
                                onClick={() => {
                                  setNavigatingCobrosId(row.contrato_cobranza_id!);
                                  startTransition(() => {
                                    router.push(`/dashboard/cobranzas/${row.contrato_cobranza_id}`);
                                  });
                                }}
                              >
                                {navigatingCobrosId === row.contrato_cobranza_id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <ReceiptText className="size-4" />
                                )}
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
        tiposOpciones={tiposCatalogo}
        estadosOpciones={estadosCatalogo}
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
