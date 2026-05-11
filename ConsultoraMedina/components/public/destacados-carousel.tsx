"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Bath, BedDouble, ChevronLeft, ChevronRight, Ruler } from "lucide-react";
import type { PublicPropiedadHome } from "@/lib/data/public-propiedades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const m2Fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function badgeEstado(estado: string) {
  switch (estado) {
    case "Venta":
      return (
        <Badge className="border-0 bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600">
          Venta
        </Badge>
      );
    case "Alquiler":
      return (
        <Badge className="border-0 bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600">
          Alquiler
        </Badge>
      );
    case "Vendida":
      return (
        <Badge
          variant="secondary"
          className="border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700"
        >
          Vendida
        </Badge>
      );
    case "Alquilada":
      return (
        <Badge className="border border-cyan-200/80 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-950">
          Alquilada
        </Badge>
      );
    case "No Disponible":
      return (
        <Badge className="border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          No disponible
        </Badge>
      );
    case "Consultar":
      return (
        <Badge
          variant="outline"
          className="border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-950"
        >
          Consultar
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold">
          {estado}
        </Badge>
      );
  }
}

function slideDepthStyle(rel: number): CSSProperties {
  const abs = Math.abs(rel);
  const scale = Math.max(0.74, 1 - abs * 0.1);
  const tz = -abs * 85;
  const tx = rel * -7;
  const rotY = rel * -11;
  const opacity = Math.max(0.42, 1 - abs * 0.24);
  const zIndex = 20 - abs * 5;
  return {
    transform: `translateX(${tx}%) translateZ(${tz}px) scale(${scale}) rotateY(${rotY}deg)`,
    opacity,
    zIndex,
  };
}

type Props = {
  items: PublicPropiedadHome[];
  onVerDetalles: (p: PublicPropiedadHome) => void;
};

export function DestacadosCarousel({ items, onVerDetalles }: Props) {
  const itemsKey = useMemo(() => items.map((x) => x.id).join(","), [items]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
    skipSnaps: false,
    dragFree: false,
  });
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelected(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    emblaApi?.reInit();
    emblaApi?.scrollTo(0, true);
  }, [emblaApi, itemsKey]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="border-b border-stone-200/80 bg-gradient-to-b from-stone-50/95 to-stone-50/40 py-12 sm:py-16"
      aria-labelledby="destacados-titulo"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2
          id="destacados-titulo"
          className="text-center text-2xl font-semibold tracking-tight text-stone-900"
        >
          Propiedades Destacadas del mes
        </h2>

        <div className="relative mx-auto mt-10 max-w-5xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-1/2 left-0 z-30 hidden -translate-x-1 -translate-y-1/2 border-stone-300 bg-white/95 shadow-sm md:inline-flex"
            aria-label="Anterior"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-1/2 right-0 z-30 hidden translate-x-1 -translate-y-1/2 border-stone-300 bg-white/95 shadow-sm md:inline-flex"
            aria-label="Siguiente"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>

          <div className="[perspective:1100px] [perspective-origin:50%_45%]">
            <div className="overflow-hidden py-6 pl-3 md:py-10 md:pl-4" ref={emblaRef}>
              <div className="flex touch-pan-y items-stretch [transform-style:preserve-3d]">
                {items.map((p, i) => {
                  const rel = i - selected;
                  const cover = p.imagenes[0] ?? "/img/casa-default.png";
                  return (
                    <div
                      key={p.id}
                      className="min-w-0 shrink-0 grow-0 basis-[88%] pl-3 sm:basis-[72%] md:basis-[62%] lg:basis-[58%]"
                    >
                      <div
                        className={cn(
                          "origin-center transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          rel !== 0 && "pointer-events-none",
                        )}
                        style={slideDepthStyle(rel)}
                      >
                        <article className="mx-auto flex max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-lg md:max-w-none">
                          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-stone-100">
                            <Image
                              src={cover}
                              alt={p.nombre}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 88vw, 480px"
                              priority={i === 0}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                            <div className="absolute top-3 left-3">{badgeEstado(p.estado)}</div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4 sm:p-5">
                            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-stone-900">
                              {p.nombre}
                            </h3>
                            <p className="text-lg font-semibold tabular-nums text-stone-800">
                              {precioFmt.format(p.valor)}
                            </p>
                            <div
                              className={cn(
                                "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-stone-600",
                                "[&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:tabular-nums",
                              )}
                            >
                              <span title="Dormitorios">
                                <BedDouble className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
                                <span className="text-sm font-medium text-stone-800">{p.dormitorios}</span>
                              </span>
                              <span title="Baños">
                                <Bath className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
                                <span className="text-sm font-medium text-stone-800">{p.banos}</span>
                              </span>
                              <span title="Metros cuadrados totales">
                                <Ruler className="size-[1.05rem] shrink-0 text-stone-400" aria-hidden />
                                <span className="text-sm font-medium text-stone-800">{m2Fmt.format(p.m2_totales)}</span>
                              </span>
                            </div>
                            <div className="mt-auto border-t border-stone-100 pt-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                                onClick={() => onVerDetalles(p)}
                              >
                                Ver detalles
                              </Button>
                            </div>
                          </div>
                        </article>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
