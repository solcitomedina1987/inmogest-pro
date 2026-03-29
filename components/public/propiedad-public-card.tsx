"use client";

import { Bath, BedDouble, Ruler } from "lucide-react";
import type { PublicPropiedadHome } from "@/lib/data/public-propiedades";
import { PROPIEDAD_IMAGEN_DEFAULT } from "@/lib/constants/propiedades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const m2CardFmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

function badgeOperacion(estado: string) {
  if (estado === "Venta") {
    return (
      <Badge className="border-0 bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600">
        Venta
      </Badge>
    );
  }
  if (estado === "Alquiler") {
    return (
      <Badge className="border-0 bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600">
        Alquiler
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800"
    >
      {estado}
    </Badge>
  );
}

type Props = {
  propiedad: PublicPropiedadHome;
  onVerDetalles: () => void;
};

export function PropiedadPublicCard({ propiedad, onVerDetalles }: Props) {
  const { nombre, valor, estado, dormitorios, banos, m2_totales } = propiedad;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- asset estático solicitado para el listado público */}
        <img
          src={PROPIEDAD_IMAGEN_DEFAULT}
          alt=""
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-3 left-3 z-10">{badgeOperacion(estado)}</div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-stone-900">
            {nombre}
          </h3>
          <p className="mt-1 text-lg font-semibold tabular-nums text-stone-800">{precioFmt.format(valor)}</p>
        </div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-5 gap-y-2 text-stone-600",
            "[&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:tabular-nums",
          )}
        >
          <span title="Dormitorios">
            <BedDouble className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
            <span className="text-sm font-medium text-stone-800">{dormitorios}</span>
          </span>
          <span title="Baños">
            <Bath className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
            <span className="text-sm font-medium text-stone-800">{banos}</span>
          </span>
          <span title="Metros cuadrados totales">
            <Ruler className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
            <span className="text-sm font-medium text-stone-800">{m2CardFmt.format(m2_totales)}</span>
          </span>
        </div>
        <div className="mt-auto border-t border-stone-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
            onClick={onVerDetalles}
          >
            Ver detalles
          </Button>
        </div>
      </div>
    </article>
  );
}
