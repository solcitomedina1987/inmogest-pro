"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type NombreCatalogoRow = { id: number; nombre: string; deleted_at: string | null };

type Props = {
  title: string;
  description: string;
  initialRows: NombreCatalogoRow[];
  onCreate: (nombre: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onUpdate: (id: number, nombre: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSoftDelete: (id: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRestore: (id: number) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function NombreCatalogoAdminClient({
  title,
  description,
  initialRows,
  onCreate,
  onUpdate,
  onSoftDelete,
  onRestore,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nombreEdit, setNombreEdit] = useState("");

  function abrirEditar(row: NombreCatalogoRow) {
    setEditId(row.id);
    setNombreEdit(row.nombre);
    setEditOpen(true);
  }

  function guardarNuevo() {
    const n = nombreNuevo.trim();
    if (!n) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const res = await onCreate(n);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Registro creado.");
      setNuevoOpen(false);
      setNombreNuevo("");
      router.refresh();
    });
  }

  function guardarEdicion() {
    if (editId == null) return;
    const n = nombreEdit.trim();
    if (!n) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const res = await onUpdate(editId, n);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Actualizado.");
      setEditOpen(false);
      setEditId(null);
      router.refresh();
    });
  }

  function baja(id: number) {
    if (!confirm("¿Dar de baja este ítem? No afecta datos históricos ya guardados.")) return;
    startTransition(async () => {
      const res = await onSoftDelete(id);
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
      const res = await onRestore(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Restaurado.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        <Button type="button" onClick={() => setNuevoOpen(true)} disabled={pending}>
          Nuevo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Filas con baja lógica siguen visibles para administración.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-32">Estado</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{row.id}</TableCell>
                  <TableCell className="font-medium">{row.nombre}</TableCell>
                  <TableCell>
                    {row.deleted_at ? (
                      <Badge variant="secondary">Baja</Badge>
                    ) : (
                      <Badge variant="outline">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => abrirEditar(row)} aria-label="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      {row.deleted_at ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => restaurar(row.id)}
                          aria-label="Restaurar"
                        >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo registro</DialogTitle>
            <DialogDescription>El nombre debe ser único entre filas activas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cat-nuevo-nombre">Nombre</Label>
            <Input id="cat-nuevo-nombre" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar</DialogTitle>
            <DialogDescription>ID {editId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cat-edit-nombre">Nombre</Label>
            <Input id="cat-edit-nombre" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
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
