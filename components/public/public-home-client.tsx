"use client";

import { useMemo, useState } from "react";
import type { PublicPropiedadHome } from "@/lib/data/public-propiedades";
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
  const [filtroOperacion, setFiltroOperacion] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [detalle, setDetalle] = useState<PublicPropiedadHome | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const filtradas = useMemo(() => {
    return initialPropiedades.filter((p) => {
      if (filtroOperacion !== "all" && p.estado !== filtroOperacion) {
        return false;
      }
      if (filtroTipo !== "all" && p.tipo !== filtroTipo) {
        return false;
      }
      return true;
    });
  }, [initialPropiedades, filtroOperacion, filtroTipo]);

  const visibles = useMemo(() => filtradas.slice(0, 9), [filtradas]);

  function abrirDetalle(p: PublicPropiedadHome) {
    setDetalle(p);
    setDetalleOpen(true);
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
              Filtrá por operación y tipo de propiedad. Los resultados se actualizan al instante.
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2 text-left">
              <label htmlFor="filtro-operacion" className="text-xs font-medium text-stone-600">
                Tipo de operación
              </label>
              <Select value={filtroOperacion} onValueChange={setFiltroOperacion}>
                <SelectTrigger id="filtro-operacion" className="h-11 w-full bg-white">
                  <SelectValue placeholder="Operación" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Alquiler">Alquiler</SelectItem>
                  <SelectItem value="Venta">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2 text-left">
              <label htmlFor="filtro-tipo" className="text-xs font-medium text-stone-600">
                Tipo de propiedad
              </label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger id="filtro-tipo" className="h-11 w-full bg-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Casa">Casa</SelectItem>
                  <SelectItem value="Departamento">Depto</SelectItem>
                  <SelectItem value="Lote">Lote</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 shrink-0 border border-stone-200 bg-white sm:mb-0"
              onClick={() => {
                setFiltroOperacion("all");
                setFiltroTipo("all");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16" aria-labelledby="propiedades-titulo">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="propiedades-titulo" className="text-2xl font-semibold tracking-tight text-stone-900">
              Propiedades disponibles
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Mostrando hasta 9 resultados según tus filtros ({filtradas.length} coincidencias).
            </p>
          </div>
        </div>
        {visibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
            <p className="text-stone-600">No hay propiedades que coincidan con los filtros seleccionados.</p>
            <Button
              type="button"
              variant="link"
              className="mt-2 text-stone-800"
              onClick={() => {
                setFiltroOperacion("all");
                setFiltroTipo("all");
              }}
            >
              Ver todas
            </Button>
          </div>
        ) : (
          <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((p) => (
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
