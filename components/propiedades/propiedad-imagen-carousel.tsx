"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  alt: string;
  urls: string[];
  className?: string;
  /** Tamaños para next/image (LCP / responsive). */
  sizes?: string;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  showGradient?: boolean;
  priority?: boolean;
};

export function PropiedadImagenCarousel({
  alt,
  urls,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  topLeft,
  topRight,
  showGradient = false,
  priority = false,
}: Props) {
  const list = urls.length ? urls : ["/img/casa-default.png"];
  const multi = list.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    loop: multi,
    align: "start",
    dragFree: false,
  });

  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !multi) {
      return;
    }
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, multi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const goTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const src = list[0];

  return (
    <div
      className={cn(
        "group relative aspect-video w-full max-w-full shrink-0 overflow-hidden bg-stone-200",
        className,
      )}
    >
      {!multi ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover object-center"
          priority={priority}
        />
      ) : (
        <>
          <div
            className="absolute inset-0 overflow-hidden touch-pan-x"
            ref={emblaRef}
            role="region"
            aria-roledescription="carrusel"
            aria-label={alt}
          >
            <div className="flex h-full">
              {list.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative h-full min-h-0 min-w-0 shrink-0 grow-0 basis-full"
                >
                  <Image
                    src={url}
                    alt={i === 0 ? alt : `${alt} — foto ${i + 1}`}
                    fill
                    sizes={sizes}
                    className="object-cover object-center"
                    priority={priority && i === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-12 bg-gradient-to-r from-black/25 to-transparent md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-12 bg-gradient-to-l from-black/25 to-transparent md:block" />

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1/2 left-1 z-20 hidden size-9 -translate-y-1/2 rounded-full border-0 bg-white/85 text-stone-800 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              scrollPrev();
            }}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1/2 right-1 z-20 hidden size-9 -translate-y-1/2 rounded-full border-0 bg-white/85 text-stone-800 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
            aria-label="Foto siguiente"
            onClick={(e) => {
              e.stopPropagation();
              scrollNext();
            }}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>

          <div
            className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5 px-2"
            role="tablist"
            aria-label="Indicadores de fotos"
          >
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={selected === i}
                aria-label={`Ir a la foto ${i + 1} de ${list.length}`}
                className={cn(
                  "h-1.5 min-w-1.5 rounded-full transition-[width,background-color] duration-200",
                  selected === i ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/45 hover:bg-white/70",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
              />
            ))}
          </div>
        </>
      )}

      {showGradient ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-black/45 via-black/10 to-transparent"
          aria-hidden
        />
      ) : null}

      {topLeft ? <div className="pointer-events-auto absolute top-3 left-3 z-30">{topLeft}</div> : null}
      {topRight ? <div className="pointer-events-auto absolute top-3 right-3 z-30">{topRight}</div> : null}
    </div>
  );
}
