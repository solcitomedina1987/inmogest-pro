"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { crearUsuarioDesdeAdmin, toggleUsuarioActivo, updatePerfilUsuario } from "@/app/actions/admin-usuarios";
import { PERFIL_ROLES_EDITABLES } from "@/lib/roles";
import { roleLabel } from "@/lib/role-label";
import type { PerfilListRow } from "@/components/admin/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  initial: PerfilListRow[];
  currentUserId: string;
};

function formatCreado(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AdminUsuariosClient({ initial, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [editRow, setEditRow] = useState<PerfilListRow | null>(null);

  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState<string>("cliente");
  const [editActivo, setEditActivo] = useState(true);

  const [nuNombre, setNuNombre] = useState("");
  const [nuEmail, setNuEmail] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuRol, setNuRol] = useState<string>("cliente");

  function abrirEditar(row: PerfilListRow) {
    setEditRow(row);
    setEditNombre(row.nombre);
    setEditEmail(row.email);
    setEditRol(row.rol);
    setEditActivo(row.is_active);
    setEditOpen(true);
  }

  function abrirNuevo() {
    setNuNombre("");
    setNuEmail("");
    setNuPassword("");
    setNuRol("cliente");
    setNuevoOpen(true);
  }

  function guardarEdicion() {
    if (!editRow) {
      return;
    }
    if (editRow.id === currentUserId && !editActivo) {
      toast.error("No podés desactivar tu propia cuenta desde aquí.");
      return;
    }
    startTransition(async () => {
      const res = await updatePerfilUsuario({
        id: editRow.id,
        nombre: editNombre,
        email: editEmail.trim(),
        rol: editRol as (typeof PERFIL_ROLES_EDITABLES)[number],
        is_active: editActivo,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Usuario actualizado.");
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  }

  function alternarActivo(row: PerfilListRow) {
    if (row.id === currentUserId && row.is_active) {
      toast.error("No podés desactivar tu propia cuenta.");
      return;
    }
    const next = !row.is_active;
    startTransition(async () => {
      const res = await toggleUsuarioActivo({ id: row.id, is_active: next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Usuario activado." : "Usuario inactivado.");
      router.refresh();
    });
  }

  function crearNuevo() {
    const emailNorm = nuEmail.trim().toLowerCase();
    if (initial.some((r) => r.email.toLowerCase() === emailNorm)) {
      toast.error("Ya hay un usuario con ese email en el listado.");
      return;
    }
    startTransition(async () => {
      const res = await crearUsuarioDesdeAdmin({
        nombre: nuNombre,
        email: nuEmail.trim(),
        password: nuPassword,
        rol: nuRol as (typeof PERFIL_ROLES_EDITABLES)[number],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.signupEmailSent === false) {
        toast.warning(
          "Usuario creado, pero no se pudo enviar el email de confirmación. Indicá al usuario que use «Olvidé mi contraseña» o revisá la configuración de Auth.",
        );
      } else {
        toast.success("Usuario creado. Se envió el email de confirmación.");
      }
      setNuevoOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-8">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Nombre, email, rol y estado. El email se sincroniza con Supabase Auth.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adm-nombre">Nombre</Label>
              <Input
                id="adm-nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-email">Email</Label>
              <Input
                id="adm-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Rol</span>
              <Select
                value={editRol}
                onValueChange={setEditRol}
                disabled={editRow?.id === currentUserId && editRow.rol === "admin"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFIL_ROLES_EDITABLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editRow?.id === currentUserId && editRow.rol === "admin" ? (
                <p className="text-muted-foreground text-xs">Tu rol administrador no puede modificarse desde aquí.</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="adm-activo">Usuario activo</Label>
                <p className="text-muted-foreground text-xs">
                  Si está desactivado, no podrá iniciar sesión (baja lógica).
                </p>
              </div>
              <Switch
                id="adm-activo"
                checked={editActivo}
                onCheckedChange={setEditActivo}
                disabled={editRow?.id === currentUserId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => guardarEdicion()} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Mismos datos que el registro público. Se envía email de confirmación de Supabase al crear la cuenta.
              No podés repetir un email ya registrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nu-nombre">Nombre completo</Label>
              <Input
                id="nu-nombre"
                value={nuNombre}
                onChange={(e) => setNuNombre(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-email">Email</Label>
              <Input
                id="nu-email"
                type="email"
                value={nuEmail}
                onChange={(e) => setNuEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-pass">Contraseña inicial</Label>
              <Input
                id="nu-pass"
                type="password"
                value={nuPassword}
                onChange={(e) => setNuPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Rol</span>
              <Select value={nuRol} onValueChange={setNuRol}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFIL_ROLES_EDITABLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => crearNuevo()}
              disabled={pending || nuPassword.length < 6 || !nuEmail.trim() || !nuNombre.trim()}
            >
              Crear y enviar confirmación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Usuarios</h1>
        <Button type="button" className="shrink-0 gap-2" onClick={abrirNuevo}>
          <UserPlus className="size-4" aria-hidden />
          Nuevo usuario
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
          <CardDescription>{initial.length} usuario(s).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-[140px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initial.map((r) => (
                  <TableRow key={r.id} className={cn(!r.is_active && "bg-muted/50")}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabel(r.rol)}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-800">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      {formatCreado(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => alternarActivo(r)}
                        disabled={pending || (r.id === currentUserId && r.is_active)}
                        aria-label={r.is_active ? "Inactivar usuario" : "Activar usuario"}
                        title={r.is_active ? "Inactivar" : "Activar"}
                      >
                        {r.is_active ? (
                          <UserMinus className="size-4 text-amber-700" aria-hidden />
                        ) : (
                          <UserCheck className="size-4 text-emerald-700" aria-hidden />
                        )}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => abrirEditar(r)}>
                        <Pencil className="size-4" aria-hidden />
                        <span className="sr-only">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
