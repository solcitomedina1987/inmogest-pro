"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileUp, FileX, Pencil, PencilLine, Printer, Search, User } from "lucide-react";
import { toast } from "sonner";
import { rescindirContratoLocacion } from "@/app/actions/contratos-locacion";
import { deriveContratoLocacionEstado, type ContratoLocacionEstado } from "@/lib/contratos/derive-estado-contrato";
import { resolveContratoDescargaUrl } from "@/lib/contratos/contrato-descarga";
import type { ContratoLocacionListRow } from "@/lib/contratos/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContratoLocacionFormDialog,
  type ClienteSelectOption,
  type PropiedadContratoOption,
} from "@/components/contratos/contrato-locacion-form-dialog";
import { cn } from "@/lib/utils";

const SELECT_Z = "z-[100] max-h-[min(18rem,var(--radix-select-content-available-height))]";

type PropietarioFiltroOption = { id: string; label: string };

type EstadoFiltro = "todos" | ContratoLocacionEstado;

type Props = {
  rows: ContratoLocacionListRow[];
  propiedadesForm: PropiedadContratoOption[];
  clientesForm: ClienteSelectOption[];
  propietariosFiltro: PropietarioFiltroOption[];
};

function pdfUrl(row: ContratoLocacionListRow): string | null {
  const d = resolveContratoDescargaUrl({
    pdf_storage_path: row.pdf_storage_path,
    adjunto_storage_path: row.adjunto_storage_path,
    adjunto_mime: row.adjunto_mime,
  });
  return d?.href ?? null;
}

function estadoBadge(estado: ContratoLocacionEstado) {
  if (estado === "VIGENTE") {
    return (
      <Badge className="border-0 bg-emerald-600 text-white hover:bg-emerald-600/90">Vigente</Badge>
    );
  }
  if (estado === "VENCIDO") {
    return <Badge variant="destructive">Vencido</Badge>;
  }
  return (
    <Badge variant="secondary" className="bg-stone-400 text-white hover:bg-stone-400/90">
      Rescindido
    </Badge>
  );
}

export function ContratosClient({ rows, propiedadesForm, clientesForm, propietariosFiltro }: Props) {
  const router = useRouter();
  const [direccion, setDireccion] = useState("");
  const [inquilino, setInquilino] = useState("");
  const [propietarioId, setPropietarioId] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");
  const direccionDebounced = useDebouncedValue(direccion, 300);
  const inquilinoDebounced = useDebouncedValue(inquilino, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [eleccionNuevo, setEleccionNuevo] = useState(false);
  const [editing, setEditing] = useState<ContratoLocacionListRow | null>(null);
  const [rescindirId, setRescindirId] = useState<string | null>(null);
  const [rescindiendo, startRescindir] = useTransition();

  const filtradas = useMemo(() => {
    const d = direccionDebounced.trim().toLowerCase();
    const inq = inquilinoDebounced.trim().toLowerCase();
    return rows.filter((r) => {
      if (d) {
        const dir = (r.propiedad_direccion ?? "").toLowerCase();
        if (!dir.includes(d)) return false;
      }
      if (inq) {
        const nom = (r.inquilino_nombre ?? "").toLowerCase();
        if (!nom.includes(inq)) return false;
      }
      if (propietarioId && r.propietario_id !== propietarioId) return false;
      if (estadoFiltro !== "todos") {
        const e = deriveContratoLocacionEstado({
          fecha_fin_contrato: r.fecha_fin_contrato,
          rescindido_at: r.rescindido_at,
          estado: r.estado,
        });
        if (e !== estadoFiltro) return false;
      }
      return true;
    });
  }, [rows, direccionDebounced, inquilinoDebounced, propietarioId, estadoFiltro]);

  function abrirNuevo() {
    setEditing(null);
    setEleccionNuevo(true);
  }

  function abrirEditar(row: ContratoLocacionListRow) {
    const e = deriveContratoLocacionEstado({
      fecha_fin_contrato: row.fecha_fin_contrato,
      rescindido_at: row.rescindido_at,
      estado: row.estado,
    });
    if (e === "RESCINDIDO") {
      toast.error("No se puede editar un contrato rescindido.");
      return;
    }
    setEditing(row);
    setFormOpen(true);
  }

  function confirmarRescindir() {
    if (!rescindirId) return;
    startRescindir(async () => {
      const res = await rescindirContratoLocacion(rescindirId);
      setRescindirId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato rescindido. La propiedad quedó liberada.");
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-6">
      <div className="flex max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contratos de locación</h1>
        <Button type="button" className="shrink-0 gap-2" onClick={abrirNuevo}>
          Nuevo contrato
        </Button>
      </div>

      <Dialog open={eleccionNuevo} onOpenChange={setEleccionNuevo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo contrato</DialogTitle>
            <DialogDescription>
              Podés generar el PDF con plantilla (alta completa) o subir un archivo ya firmado cuando el alquiler
              esté registrado en Cobranzas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="default"
              className="h-auto flex-col gap-2 py-6"
              onClick={() => {
                setEleccionNuevo(false);
                setFormOpen(true);
              }}
            >
              <PencilLine className="size-5" aria-hidden />
              Generar contrato web
            </Button>
            <Button type="button" variant="secondary" className="h-auto flex-col gap-2 py-6" asChild>
              <Link href="/dashboard/cobranzas" onClick={() => setEleccionNuevo(false)}>
                <FileUp className="size-5" aria-hidden />
                Subir archivo
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            Subir PDF o Word: en <strong>Alquileres</strong>, columna Contrato, tocá el ícono <strong>+</strong> del
            contrato correspondiente.
          </p>
        </DialogContent>
      </Dialog>

      <Card className="border shadow-sm">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Dirección</Label>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  className="h-9 pl-9"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Filtrar por dirección…"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Inquilino</Label>
              <div className="relative">
                <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  className="h-9 pl-9"
                  value={inquilino}
                  onChange={(e) => setInquilino(e.target.value)}
                  placeholder="Nombre…"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs font-medium">Propietario</span>
              <Select value={propietarioId || "all"} onValueChange={(v) => setPropietarioId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" className={SELECT_Z}>
                  <SelectItem value="all">Todos</SelectItem>
                  {propietariosFiltro.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs font-medium">Estado</span>
              <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoFiltro)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className={SELECT_Z}>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="VIGENTE">Vigente</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="RESCINDIDO">Rescindido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
          <CardDescription>Los filtros se aplican al instante. El estado vigente/vencido se calcula según la fecha de fin.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay contratos registrados. Creá el primero con el botón superior (requiere migración de base de datos
              aplicada).
            </p>
          ) : filtradas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No se encontraron contratos que coincidan con los filtros.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[160px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((r) => {
                    const est = deriveContratoLocacionEstado({
                      fecha_fin_contrato: r.fecha_fin_contrato,
                      rescindido_at: r.rescindido_at,
                      estado: r.estado,
                    });
                    const url = pdfUrl(r);
                    const puedeEditar = est !== "RESCINDIDO";
                    const puedeRescindir = est !== "RESCINDIDO";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {r.propiedad_direccion ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.propietario_nombre ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.inquilino_nombre ?? "—"}</TableCell>
                        <TableCell className="tabular-nums text-sm">{r.fecha_inicio_contrato}</TableCell>
                        <TableCell className="tabular-nums text-sm">{r.fecha_fin_contrato}</TableCell>
                        <TableCell>{estadoBadge(est)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-center gap-0.5">
                            <Button variant="ghost" size="icon" className="size-8" asChild>
                              <Link href={`/dashboard/contratos/${r.id}`} aria-label="Ver detalle">
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={!url}
                              aria-label="Abrir PDF"
                              onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                            >
                              <Printer className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn("size-8", !puedeEditar && "opacity-40")}
                              disabled={!puedeEditar}
                              aria-label="Editar"
                              onClick={() => abrirEditar(r)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn("size-8 text-destructive", !puedeRescindir && "opacity-40")}
                              disabled={!puedeRescindir || rescindiendo}
                              aria-label="Rescindir contrato"
                              onClick={() => setRescindirId(r.id)}
                            >
                              <FileX className="size-4" />
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

      <ContratoLocacionFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        propiedades={propiedadesForm}
        clientes={clientesForm}
      />

      <AlertDialog open={!!rescindirId} onOpenChange={(o) => !o && setRescindirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rescindir este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción liberará la propiedad y marcará el contrato como finalizado en cobranzas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rescindiendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={rescindiendo}
              onClick={(e) => {
                e.preventDefault();
                confirmarRescindir();
              }}
            >
              {rescindiendo ? "Procesando…" : "Sí, rescindir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
