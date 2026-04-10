"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EstadoCobroFiltro = "todos" | "pagado" | "pendiente" | "atrasado";

export type PropietarioFiltroOption = { id: string; label: string };

type Props = {
  direccion: string;
  onDireccionChange: (v: string) => void;
  inquilino: string;
  onInquilinoChange: (v: string) => void;
  propietarioId: string;
  onPropietarioIdChange: (v: string) => void;
  propietarios: PropietarioFiltroOption[];
  estadoCobro: EstadoCobroFiltro;
  onEstadoCobroChange: (v: EstadoCobroFiltro) => void;
  incluirEliminados: boolean;
};

const SELECT_CONTENT_CLASS =
  "z-[100] max-h-[min(18rem,var(--radix-select-content-available-height))]";

export function AlquileresContratosFiltros({
  direccion,
  onDireccionChange,
  inquilino,
  onInquilinoChange,
  propietarioId,
  onPropietarioIdChange,
  propietarios,
  estadoCobro,
  onEstadoCobroChange,
  incluirEliminados,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eliminados, setEliminados] = useState(incluirEliminados);

  useEffect(() => {
    setEliminados(incluirEliminados);
  }, [incluirEliminados]);

  function syncEliminadosUrl(next: boolean) {
    setEliminados(next);
    startTransition(() => {
      const params = new URLSearchParams();
      if (next) params.set("eliminados", "1");
      const s = params.toString();
      router.replace(s ? `/dashboard/cobranzas?${s}` : "/dashboard/cobranzas");
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-2 sm:gap-3",
            "sm:grid-cols-2 xl:grid-cols-4",
          )}
        >
          <div className="space-y-1">
            <Label htmlFor="filtro-direccion" className="text-muted-foreground text-xs">
              Dirección
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="filtro-direccion"
                className="h-9 pl-9"
                value={direccion}
                onChange={(e) => onDireccionChange(e.target.value)}
                placeholder="Calle, número…"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="filtro-inquilino" className="text-muted-foreground text-xs">
              Inquilino
            </Label>
            <div className="relative">
              <User
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="filtro-inquilino"
                className="h-9 pl-9"
                value={inquilino}
                onChange={(e) => onInquilinoChange(e.target.value)}
                placeholder="Nombre del inquilino…"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block text-xs font-medium">Propietario</span>
            <div className="relative">
              <Building2
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Select
                value={propietarioId || "all"}
                onValueChange={(v) => onPropietarioIdChange(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-9 w-full pl-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" className={SELECT_CONTENT_CLASS}>
                  <SelectItem value="all">Todos los propietarios</SelectItem>
                  {propietarios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block text-xs font-medium">Estado de cobro</span>
            <Select value={estadoCobro} onValueChange={(v) => onEstadoCobroChange(v as EstadoCobroFiltro)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className={SELECT_CONTENT_CLASS}>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={eliminados}
            disabled={pending}
            onChange={(e) => {
              syncEliminadosUrl(e.target.checked);
            }}
            className="border-input size-4 rounded border"
          />
          <span className={pending ? "text-muted-foreground" : undefined}>Incluir contratos eliminados</span>
        </label>
      </CardContent>
    </Card>
  );
}
