"use client";

import { X } from "lucide-react";
import type { PublicPropiedadHome } from "@/lib/data/public-propiedades";
import {
  PropiedadPreviewContent,
  type PropiedadPreviewModel,
} from "@/components/propiedades/propiedad-preview-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";

function toPreview(p: PublicPropiedadHome): PropiedadPreviewModel {
  return {
    nombre: p.nombre,
    tipo: p.tipo,
    estado: p.estado,
    valor: p.valor,
    dormitorios: p.dormitorios,
    banos: p.banos,
    m2_totales: p.m2_totales,
    m2_cubiertos: p.m2_cubiertos,
    direccion: p.direccion,
    ubicacion_texto: p.ubicacion_texto,
    imageUrls: p.imagenes,
    descripcion: p.descripcion,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: PublicPropiedadHome | null;
};

export function PublicPropiedadDetalleDialog({ open, onOpenChange, propiedad }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {propiedad ? (
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-stone-200/80 p-0 shadow-xl sm:h-[min(92dvh,920px)] sm:max-h-[min(92dvh,920px)] sm:max-w-4xl sm:w-full lg:max-w-5xl"
        >
          <div className="flex shrink-0 items-center justify-end border-b border-stone-200/90 bg-white px-2 py-1.5">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 rounded-full text-stone-700 hover:bg-stone-100"
                aria-label="Cerrar"
              >
                <X className="size-6" strokeWidth={2} />
              </Button>
            </DialogClose>
          </div>

          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <PropiedadPreviewContent data={toPreview(propiedad)} />
          </div>

          <div className="shrink-0 border-t border-stone-200/90 bg-white px-4 py-3 sm:hidden">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 w-full border-stone-300 text-stone-800">
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
