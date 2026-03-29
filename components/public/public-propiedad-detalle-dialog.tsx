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
    imageSrc: p.imagen_modal,
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
          className="max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 overflow-y-auto overflow-x-hidden border-stone-200/80 p-0 shadow-xl sm:w-full"
        >
          <PropiedadPreviewContent
            data={toPreview(propiedad)}
            overlay={
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-9 rounded-full border border-white/50 bg-white/92 text-stone-700 shadow-md backdrop-blur-sm hover:bg-white"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            }
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
