"use client";

import { useMemo, useState } from "react";
import type { PublicPropiedadHome } from "@/lib/data/public-propiedades";
import { PUBLIC_HOME_ESTADOS_ORDENADOS } from "@/lib/constants/public-site";
import { TIPO_PROPIEDAD_VALUES } from "@/lib/constants/propiedades";
import { PropiedadPublicCard } from "@/components/public/propiedad-public-card";
import { PublicPropiedadDetalleDialog } from "@/components/public/public-propiedad-detalle-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initialPropiedades: PublicPropiedadHome[];
};

export function PublicHomeClient({ initialPropiedades }: Props) {
  /** Rubro: todos | operaciones de alquiler | operaciones de venta (agrupa estados relacionados). */
  const [filtroRubro, setFiltroRubro] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  /** Estado comercial exacto del enum; "all" = Todos. */
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [detalle, setDetalle] = useState<PublicPropiedadHome | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const filtradas = useMemo(() => {
    return initialPropiedades.filter((p) => {
      if (filtroRubro === "Alquiler") {
        if (p.estado !== "Alquiler" && p.estado !== "Alquilada") {
          return false;
        }
      }
      if (filtroRubro === "Venta") {
        if (p.estado !== "Venta" && p.estado !== "Vendida") {
          return false;
        }
      }

      if (filtroTipo !== "all" && p.tipo !== filtroTipo) {
        return false;
      }

      if (filtroEstado !== "all" && p.estado !== filtroEstado) {
        return false;
      }

      return true;
    });
  }, [initialPropiedades, filtroRubro, filtroTipo, filtroEstado]);

  function abrirDetalle(p: PublicPropiedadHome) {
    setDetalle(p);
    setDetalleOpen(true);
  }

  function limpiarFiltros() {
    setFiltroRubro("all");
    setFiltroTipo("all");
    setFiltroEstado("all");
  }

  return (
    <>
      <section className="border-b border-stone-200/80 bg-gradient-to-b from-white to-stone-50/80">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Bienvenido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Encontrá tu próximo espacio
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
              Filtrá por operación, tipo y estado. El catálogo incluye propiedades disponibles y operaciones
              cerradas (alquiladas, vendidas, etc.).
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-stretch gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 text-left">
                <label htmlFor="filtro-rubro" className="text-xs font-medium text-stone-600">
                  Tipo de operación
                </label>
                <Select value={filtroRubro} onValueChange={setFiltroRubro}>
                  <SelectTrigger id="filtro-rubro" className="h-11 w-full bg-white">
                    <SelectValue placeholder="Tipo de operación" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Alquiler">Alquiler</SelectItem>
                    <SelectItem value="Venta">Venta</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-snug text-stone-500">
                  &quot;Alquiler&quot; incluye <strong>Alquiler</strong> y <strong>Alquilada</strong>. &quot;Venta&quot; incluye{" "}
                  <strong>Venta</strong> y <strong>Vendida</strong>.
                </p>
              </div>
              <div className="space-y-2 text-left">
                <label htmlFor="filtro-tipo" className="text-xs font-medium text-stone-600">
                  Tipo de propiedad
                </label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger id="filtro-tipo" className="h-11 w-full bg-white">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="all">Todos</SelectItem>
                    {TIPO_PROPIEDAD_VALUES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "Departamento" ? "Depto" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-left">
                <label htmlFor="filtro-estado" className="text-xs font-medium text-stone-600">
                  Estado
                </label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger id="filtro-estado" className="h-11 w-full bg-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="all">Todos</SelectItem>
                    {PUBLIC_HOME_ESTADOS_ORDENADOS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="h-11 shrink-0 border border-stone-200 bg-white"
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16" aria-labelledby="propiedades-titulo">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="propiedades-titulo" className="text-2xl font-semibold tracking-tight text-stone-900">
              Catálogo de propiedades
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {filtradas.length} resultado{filtradas.length === 1 ? "" : "s"} según tus filtros (solo filas
              activas en el sistema).
            </p>
          </div>
        </div>
        {filtradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
            <p className="text-stone-600">No hay propiedades que coincidan con los filtros seleccionados.</p>
            <Button type="button" variant="link" className="mt-2 text-stone-800" onClick={limpiarFiltros}>
              Ver todas
            </Button>
          </div>
        ) : (
          <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((p) => (
              <li key={p.id}>
                <PropiedadPublicCard propiedad={p} onVerDetalles={() => abrirDetalle(p)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="border-t border-stone-200 bg-white py-14 sm:py-16"
        aria-labelledby="quienes-somos-titulo"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:text-left">
          <h2 id="quienes-somos-titulo" className="text-2xl font-semibold tracking-tight text-stone-900">
            Quiénes somos
          </h2>
          <div className="text-muted-foreground mt-6 space-y-4 text-sm leading-relaxed sm:text-base">
            <p>
              Somos un equipo de profesionales del sector inmobiliario dedicados a acompañarte en cada
              etapa: desde la búsqueda hasta el cierre de la operación. Combinamos experiencia local,
              procesos claros y atención personalizada.
            </p>
            <p>
              Nuestra misión es simplificar la experiencia de alquilar, vender o invertir, con
              información transparente y un servicio cercano. Este texto es un placeholder: reemplazalo
              con la historia y los valores de tu inmobiliaria.
            </p>
          </div>
        </div>
      </section>

      <PublicPropiedadDetalleDialog
        open={detalleOpen}
        onOpenChange={(o) => {
          setDetalleOpen(o);
          if (!o) {
            setDetalle(null);
          }
        }}
        propiedad={detalle}
      />
    </>
  );
}
