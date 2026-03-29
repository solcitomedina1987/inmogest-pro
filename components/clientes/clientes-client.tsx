"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { deactivateCliente } from "@/app/actions/clientes";
import type { TipoCliente } from "@/lib/constants/clientes";
import { TIPO_CLIENTE_VALUES } from "@/lib/constants/clientes";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog";
import type { ClienteListRow } from "@/components/clientes/types";
import { cn } from "@/lib/utils";

function normalizar(s: string) {
  return s.trim().toLowerCase();
}

function badgeTipoCliente(t: TipoCliente) {
  const map = {
    Propietario: "bg-blue-100 text-blue-800 border-transparent hover:bg-blue-100",
    Inquilino: "bg-green-100 text-green-800 border-transparent hover:bg-green-100",
    Ambos: "bg-purple-100 text-purple-800 border-transparent hover:bg-purple-100",
  } as const;
  return map[t];
}

type Props = {
  initial: ClienteListRow[];
};

export function ClientesClient({ initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteListRow | null>(null);
  const [qNombre, setQNombre] = useState("");
  const [qDni, setQDni] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | TipoCliente>("todos");
  const [verInactivos, setVerInactivos] = useState(false);
  const [cascadeTarget, setCascadeTarget] = useState<ClienteListRow | null>(null);

  const filtrados = useMemo(() => {
    const nq = normalizar(qNombre);
    const dq = qDni.replace(/\D/g, "");
    return initial.filter((r) => {
      if (!verInactivos && !r.is_active) {
        return false;
      }
      if (tipoFiltro !== "todos" && r.tipo_cliente !== tipoFiltro) {
        return false;
      }
      if (nq && !normalizar(r.nombre_completo).includes(nq)) {
        return false;
      }
      if (dq && !String(r.dni).includes(dq)) {
        return false;
      }
      return true;
    });
  }, [initial, qNombre, qDni, tipoFiltro, verInactivos]);

  function abrirNuevo() {
    setEditing(null);
    setOpen(true);
  }

  function abrirEditar(row: ClienteListRow) {
    setEditing(row);
    setOpen(true);
  }

  async function ejecutarBaja(row: ClienteListRow, opciones: { cascadePropiedades: boolean }) {
    const res = await deactivateCliente(row.id, opciones);
    if (res.ok) {
      toast.success(
        opciones.cascadePropiedades
          ? "Cliente y propiedades vinculadas dados de baja."
          : "Cliente dado de baja.",
      );
      setCascadeTarget(null);
      router.refresh();
      return;
    }
    if ("code" in res && res.code === "CASCADE_REQUIRED") {
      setCascadeTarget(row);
      return;
    }
    toast.error(res.error);
  }

  function solicitarBaja(row: ClienteListRow) {
    if (!row.is_active) {
      return;
    }
    void ejecutarBaja(row, { cascadePropiedades: false });
  }

  function confirmarBajaEnCascada() {
    if (!cascadeTarget) {
      return;
    }
    void ejecutarBaja(cascadeTarget, { cascadePropiedades: true });
  }

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-8">
      <AlertDialog
        open={cascadeTarget != null}
        onOpenChange={(next) => {
          if (!next) {
            setCascadeTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Propiedades vinculadas</AlertDialogTitle>
            <AlertDialogDescription>
              Este propietario tiene propiedades vinculadas. Al darlo de baja, todas sus propiedades también
              pasarán a estar inactivas. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" onClick={() => confirmarBajaEnCascada()}>
              Continuar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClienteFormDialog open={open} onOpenChange={setOpen} editing={editing} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Personas unificadas: propietarios, inquilinos o ambos. Baja lógica sin borrar historial.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={abrirNuevo}>
          <UserPlus className="size-4" aria-hidden />
          Nuevo cliente
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Buscá por nombre, DNI o tipo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <label className="text-sm font-medium" htmlFor="filtro-nombre">
              Nombre
            </label>
            <Input
              id="filtro-nombre"
              placeholder="Nombre completo…"
              value={qNombre}
              onChange={(e) => setQNombre(e.target.value)}
            />
          </div>
          <div className="min-w-[140px] space-y-2">
            <label className="text-sm font-medium" htmlFor="filtro-dni">
              DNI
            </label>
            <Input
              id="filtro-dni"
              inputMode="numeric"
              placeholder="DNI…"
              value={qDni}
              onChange={(e) => setQDni(e.target.value)}
            />
          </div>
          <div className="min-w-[200px] space-y-2">
            <span className="text-sm font-medium">Tipo</span>
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as typeof tipoFiltro)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPO_CLIENTE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
              className="border-input size-4 rounded border"
            />
            Incluir dados de baja
          </label>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
          <CardDescription>{filtrados.length} registro(s) en la vista actual.</CardDescription>
        </CardHeader>
        <CardContent>
          {filtrados.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No hay clientes que coincidan.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre completo</TableHead>
                    <TableHead className="tabular-nums">DNI</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => (
                    <TableRow key={r.id} className={!r.is_active ? "bg-muted/40 text-muted-foreground" : undefined}>
                      <TableCell className="font-medium">{r.nombre_completo}</TableCell>
                      <TableCell className="tabular-nums">{r.dni}</TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium", badgeTipoCliente(r.tipo_cliente))} variant="secondary">
                          {r.tipo_cliente}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.is_active ? (
                          <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-100">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border-transparent bg-zinc-200 text-zinc-700 hover:bg-zinc-200">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{r.telefono}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => abrirEditar(r)}>
                            <Pencil className="size-4" aria-hidden />
                            <span className="sr-only">Editar</span>
                          </Button>
                          {r.is_active ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => solicitarBaja(r)}
                            >
                              <UserMinus className="size-4" aria-hidden />
                              <span className="sr-only">Dar de baja</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
