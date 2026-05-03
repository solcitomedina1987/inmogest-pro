"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import {
  createConceptoPago,
  restoreConceptoPago,
  softDeleteConceptoPago,
  updateConceptoPago,
} from "@/app/actions/config-catalogos";
import { IMPACTO_CATALOGO_DB_VALUES, type ImpactoCatalogoDb } from "@/lib/config-global/impacto-catalogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LucideIconByName } from "@/components/ui/lucide-icon-by-name";
import { adminPanelCardClass, adminTableHeadClass } from "@/lib/admin/admin-panel-table";
import { cn } from "@/lib/utils";

type Props = {
  initialRows: ConceptoPagoCatalogoRow[];
};

export function ConceptosPagoAdminClient({ initialRows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ConceptoPagoCatalogoRow | null>(null);

  const [nuNombre, setNuNombre] = useState("");
  const [nuImpacto, setNuImpacto] = useState<ImpactoCatalogoDb>("Suma al Propietario");
  const [nuIcono, setNuIcono] = useState("Circle");
  const [nuSlug, setNuSlug] = useState("");

  const [edNombre, setEdNombre] = useState("");
  const [edImpacto, setEdImpacto] = useState<ImpactoCatalogoDb>("Suma al Propietario");
  const [edIcono, setEdIcono] = useState("Circle");
  const [edSlug, setEdSlug] = useState("");

  function abrirNuevo() {
    setNuNombre("");
    setNuImpacto("Suma al Propietario");
    setNuIcono("Circle");
    setNuSlug("");
    setNuevoOpen(true);
  }

  function abrirEditar(row: ConceptoPagoCatalogoRow) {
    setEditRow(row);
    setEdNombre(row.nombre);
    setEdImpacto(row.impacto);
    setEdIcono(row.icono || "Circle");
    setEdSlug(row.slug ?? "");
    setEditOpen(true);
  }

  function guardarNuevo() {
    const n = nuNombre.trim();
    if (!n) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const res = await createConceptoPago({
        nombre: n,
        impacto: nuImpacto,
        icono: nuIcono.trim() || "Circle",
        slug: nuSlug.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Concepto creado.");
      setNuevoOpen(false);
      router.refresh();
    });
  }

  function guardarEdicion() {
    if (!editRow) return;
    const n = edNombre.trim();
    if (!n) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const res = await updateConceptoPago({
        id: editRow.id,
        nombre: n,
        impacto: edImpacto,
        icono: edIcono.trim() || "Circle",
        slug: edSlug.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Actualizado.");
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  }

  function baja(id: number) {
    if (!confirm("¿Dar de baja este concepto? Los pagos ya guardados conservan etiqueta e impacto histórico.")) return;
    startTransition(async () => {
      const res = await softDeleteConceptoPago(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Dado de baja.");
      router.refresh();
    });
  }

  function restaurar(id: number) {
    startTransition(async () => {
      const res = await restoreConceptoPago(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Restaurado.");
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-0">
      <Card className={adminPanelCardClass}>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Conceptos de pago</CardTitle>
            <CardDescription>
              Impacto al registrar cobros (suma o resta al propietario, o inmobiliaria).
            </CardDescription>
          </div>
          <Button type="button" className="shrink-0 sm:mt-0.5" onClick={abrirNuevo} disabled={pending}>
            Nuevo concepto
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(adminTableHeadClass, "pl-4 sm:pl-6")}>Nombre</TableHead>
                <TableHead className={cn(adminTableHeadClass, "max-w-[220px]")}>Impacto</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-14 text-center")}>Icono</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-28")}>Estado</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-40 pr-4 text-right sm:pr-6")}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-foreground pl-4 font-medium whitespace-normal sm:pl-6">{row.nombre}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] text-sm whitespace-normal">{row.impacto}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className="inline-flex items-center justify-center rounded-md border border-border bg-muted/40 p-1.5"
                      title={row.icono || "Circle"}
                    >
                      <LucideIconByName name={row.icono} className="text-foreground size-5" />
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.deleted_at ? (
                      <Badge variant="secondary">Baja</Badge>
                    ) : (
                      <Badge variant="outline">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right sm:pr-6">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => abrirEditar(row)} aria-label="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      {row.deleted_at ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => restaurar(row.id)} aria-label="Restaurar">
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : (
                        <Button type="button" variant="ghost" size="icon" onClick={() => baja(row.id)} aria-label="Dar de baja">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo concepto de pago</DialogTitle>
            <DialogDescription>El impacto se aplica automáticamente al registrar pagos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="cp-nombre">Nombre</Label>
              <Input id="cp-nombre" value={nuNombre} onChange={(e) => setNuNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Impacto</Label>
              <Select value={nuImpacto} onValueChange={(v) => setNuImpacto(v as ImpactoCatalogoDb)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACTO_CATALOGO_DB_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-icono">Icono (Lucide, nombre)</Label>
              <Input id="cp-icono" value={nuIcono} onChange={(e) => setNuIcono(e.target.value)} placeholder="Circle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-slug">Slug opcional</Label>
              <Input id="cp-slug" value={nuSlug} onChange={(e) => setNuSlug(e.target.value)} placeholder="ej. luz" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={guardarNuevo}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar concepto</DialogTitle>
            <DialogDescription>Modificá nombre, impacto, icono o slug opcional.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="cp-ed-nombre">Nombre</Label>
              <Input id="cp-ed-nombre" value={edNombre} onChange={(e) => setEdNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Impacto</Label>
              <Select value={edImpacto} onValueChange={(v) => setEdImpacto(v as ImpactoCatalogoDb)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACTO_CATALOGO_DB_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-ed-icono">Icono</Label>
              <Input id="cp-ed-icono" value={edIcono} onChange={(e) => setEdIcono(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-ed-slug">Slug</Label>
              <Input id="cp-ed-slug" value={edSlug} onChange={(e) => setEdSlug(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={guardarEdicion}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
