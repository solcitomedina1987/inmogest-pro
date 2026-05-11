"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronsUpDown,
  Eye,
  FileText,
  Printer,
  RotateCcw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { InformeRendicionListRow } from "@/lib/informes/rendicion-types";
import { archivarInformeRendicion, restaurarInformeRendicion } from "@/app/actions/informes-rendicion";
import { NuevoInformeDialog, type PropietarioOption } from "@/components/informes/nuevo-informe-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function labelMesPeriodo(ym: string): string {
  try {
    const d = parseISO(`${ym}-01`);
    if (Number.isNaN(d.getTime())) return ym;
    return format(d, "LLLL yyyy", { locale: es });
  } catch {
    return ym;
  }
}

type Props = {
  rows: InformeRendicionListRow[];
  propietarios: PropietarioOption[];
};

export function InformesRendicionClient({ rows, propietarios }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const [verArchivados, setVerArchivados] = useState(false);
  const [propietarioId, setPropietarioId] = useState<string | null>(null);
  const [mesPeriodo, setMesPeriodo] = useState<string | null>(null);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [mesPopoverOpen, setMesPopoverOpen] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);

  const propietarioLabel = useMemo(() => {
    if (!propietarioId) return "Todos los propietarios";
    const p = propietarios.find((x) => x.id === propietarioId);
    return p?.label ?? "—";
  }, [propietarioId, propietarios]);

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.mes_periodo);
    return [...set].sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (verArchivados) {
        if (!r.deleted_at) return false;
      } else if (r.deleted_at) {
        return false;
      }
      if (propietarioId && r.propietario_cliente_id !== propietarioId) return false;
      if (mesPeriodo && r.mes_periodo !== mesPeriodo) return false;
      return true;
    });
  }, [rows, verArchivados, propietarioId, mesPeriodo]);

  function ejecutarArchivar() {
    if (!archiveTargetId) return;
    startTransition(async () => {
      const res = await archivarInformeRendicion(archiveTargetId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rendición archivada.");
      setArchiveTargetId(null);
      router.refresh();
    });
  }

  function ejecutarRestaurar(id: string) {
    startTransition(async () => {
      const res = await restaurarInformeRendicion(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Informe restaurado.");
      router.refresh();
    });
  }

  const mesCalendarSelected = mesPeriodo ? parseISO(`${mesPeriodo}-01`) : undefined;

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-6">
      <div className="flex max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rendiciones</h1>
        <Button type="button" className="shrink-0 gap-2" onClick={() => setNuevoOpen(true)}>
          <FileText className="size-4" aria-hidden />
          Nuevo informe
        </Button>
      </div>

      <NuevoInformeDialog open={nuevoOpen} onOpenChange={setNuevoOpen} propietarios={propietarios} />

      <AlertDialog open={archiveTargetId != null} onOpenChange={(o) => !o && setArchiveTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar esta rendición?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas archivar esta rendición? No se borra de la base de datos; podés recuperarla
              desde la vista de eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => ejecutarArchivar()}
            >
              Archivar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border shadow-sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg">Historial</CardTitle>
          <CardDescription>
            Mostrando {filtered.length} de {rows.length} informe(s). Por defecto solo activos; usá los filtros para
            refinar o ver la papelera.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid min-w-0 flex-1 gap-2 sm:max-w-[280px]">
              <Label className="text-muted-foreground text-xs font-medium">Propietario</Label>
              <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={ownerPopoverOpen}
                    className="h-10 w-full justify-between font-normal"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <UserRound className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <span className="truncate">{propietarioLabel}</span>
                    </span>
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-60" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin coincidencias.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="todos todos los propietarios"
                          onSelect={() => {
                            setPropietarioId(null);
                            setOwnerPopoverOpen(false);
                          }}
                        >
                          Todos los propietarios
                        </CommandItem>
                        {propietarios.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.label} ${p.id}`}
                            onSelect={() => {
                              setPropietarioId(p.id);
                              setOwnerPopoverOpen(false);
                            }}
                          >
                            {p.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid min-w-0 gap-2 sm:max-w-[240px]">
              <Label className="text-muted-foreground text-xs font-medium">Mes / período</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={mesPopoverOpen} onOpenChange={setMesPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="h-10 min-w-[10rem] justify-start gap-2 font-normal">
                      <CalendarIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <span className="truncate">{mesPeriodo ? labelMesPeriodo(mesPeriodo) : "Todos los períodos"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={mesCalendarSelected}
                      defaultMonth={mesCalendarSelected ?? new Date()}
                      onSelect={(d) => {
                        if (d) {
                          setMesPeriodo(format(d, "yyyy-MM"));
                          setMesPopoverOpen(false);
                        }
                      }}
                    />
                    <div className="border-t p-2">
                      <p className="text-muted-foreground mb-2 px-1 text-xs">Rápido (períodos con informes)</p>
                      <div className="max-h-32 space-y-0.5 overflow-y-auto">
                        {mesesDisponibles.slice(0, 24).map((ym) => (
                          <button
                            key={ym}
                            type="button"
                            className={cn(
                              "hover:bg-accent block w-full rounded px-2 py-1 text-left text-sm",
                              mesPeriodo === ym && "bg-accent font-medium",
                            )}
                            onClick={() => {
                              setMesPeriodo(ym);
                              setMesPopoverOpen(false);
                            }}
                          >
                            {labelMesPeriodo(ym)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {mesPeriodo ? (
                  <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" onClick={() => setMesPeriodo(null)} aria-label="Quitar filtro de mes">
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:ml-auto">
              <Label htmlFor="ver-archivados" className="text-muted-foreground text-xs font-medium">
                Papelera
              </Label>
              <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3">
                <Switch id="ver-archivados" checked={verArchivados} onCheckedChange={setVerArchivados} />
                <span className="text-sm">{verArchivados ? "Eliminados (papelera)" : "Solo activos"}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setPropietarioId(null);
                setMesPeriodo(null);
                setVerArchivados(false);
              }}
            >
              Limpiar filtros
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {rows.length === 0
                ? "Aún no hay informes. Creá el primero con «Nuevo informe»."
                : "Ningún informe coincide con los filtros. Probá limpiar filtros o cambiar la vista de papelera."}
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Propietario</TableHead>
                    <TableHead className="font-semibold">Período</TableHead>
                    <TableHead className="font-semibold">Monto total</TableHead>
                    <TableHead className="font-semibold">Fecha de generación</TableHead>
                    <TableHead className="w-[140px] text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className={cn(
                        r.deleted_at && "bg-muted/50 text-muted-foreground opacity-80",
                      )}
                    >
                      <TableCell className="max-w-[200px] font-medium whitespace-normal text-foreground">
                        {r.propietario_nombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{labelMesPeriodo(r.mes_periodo)}</TableCell>
                      <TableCell className="tabular-nums text-foreground">{precioFmt.format(r.monto_total)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {fechaFmt.format(new Date(r.fecha_generacion))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                          {verArchivados ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Restaurar informe"
                              disabled={pending}
                              onClick={() => ejecutarRestaurar(r.id)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label="Archivar informe"
                              disabled={pending}
                              onClick={() => setArchiveTargetId(r.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
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

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <FileText className="size-3.5 shrink-0" aria-hidden />
        El PDF replica el contenido guardado al momento de la generación.
      </p>
    </div>
  );
}
