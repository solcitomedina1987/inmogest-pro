"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Phone, Search, Trash2 } from "lucide-react";
import { deactivateVendor } from "@/app/actions/vendors";
import { PROFESIONES_VENDOR } from "@/lib/constants/vendors";
import { urlWhatsApp } from "@/lib/vendors/wa-phone";
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
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import type { VendorRow } from "@/components/vendors/types";

type EstadoFiltro = "activos" | "eliminados" | "todos";

type Props = {
  rows: VendorRow[];
};

function normalizar(s: string) {
  return s.trim().toLowerCase();
}

export function VendorsClient({ rows }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [profesion, setProfesion] = useState<string>("todas");
  const [estado, setEstado] = useState<EstadoFiltro>("activos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [pending, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    let list = rows;
    const nq = normalizar(q);
    if (nq) {
      list = list.filter((r) => normalizar(r.nombre_apellido).includes(nq));
    }
    if (profesion !== "todas") {
      list = list.filter((r) => r.profesion === profesion);
    }
    if (estado === "activos") {
      list = list.filter((r) => r.is_active);
    } else if (estado === "eliminados") {
      list = list.filter((r) => !r.is_active);
    }
    return list;
  }, [rows, q, profesion, estado]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: VendorRow) {
    setEditing(row);
    setOpen(true);
  }

  function handleDelete(row: VendorRow) {
    if (!row.is_active) {
      return;
    }
    if (!confirm(`¿Dar de baja a ${row.nombre_apellido}? (baja lógica)`)) {
      return;
    }
    startTransition(async () => {
      const res = await deactivateVendor(row.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex max-w-full min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agenda de proveedores</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Contactos por profesión. La baja es lógica; usá el filtro &quot;Eliminados&quot; para verlos.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            Nuevo proveedor
          </Button>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-lg">Listado</CardTitle>
              <CardDescription>Buscá por nombre y filtrá por profesión y estado.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="relative min-w-[200px] flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Buscar por nombre"
                />
              </div>
              <div className="w-full space-y-1.5 sm:w-48">
                <span className="text-muted-foreground text-xs font-medium">Profesión</span>
                <Select value={profesion} onValueChange={setProfesion}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="todas">Todas</SelectItem>
                    {PROFESIONES_VENDOR.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full space-y-1.5 sm:w-48">
                <span className="text-muted-foreground text-xs font-medium">Estado</span>
                <Select value={estado} onValueChange={(v) => setEstado(v as EstadoFiltro)}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="activos">Activos</SelectItem>
                    <SelectItem value="eliminados">Eliminados</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtradas.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No hay proveedores con estos criterios.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Profesión</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((row) => {
                      const wa = urlWhatsApp(row.telefono);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-[200px] font-medium">
                            <span className="line-clamp-2">{row.nombre_apellido}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.profesion}</Badge>
                          </TableCell>
                          <TableCell>
                            {wa ? (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary inline-flex max-w-[220px] items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                              >
                                <MessageCircle className="size-4 shrink-0" aria-hidden />
                                <span className="truncate">{row.telefono}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                                <Phone className="size-4 shrink-0" aria-hidden />
                                {row.telefono}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.is_active ? (
                              <Badge variant="outline" className="border-emerald-600 text-emerald-800">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
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
                                aria-label="Eliminar"
                                disabled={pending || !row.is_active}
                                onClick={() => handleDelete(row)}
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

      <VendorFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}
