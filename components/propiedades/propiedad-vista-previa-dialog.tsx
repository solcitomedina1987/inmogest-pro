"use client";

import { X } from "lucide-react";
import type { PropiedadListRow } from "@/components/propiedades/types";
import {
  PropiedadPreviewContent,
  type PropiedadPreviewModel,
} from "@/components/propiedades/propiedad-preview-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";

function rowToPreview(row: PropiedadListRow): PropiedadPreviewModel {
  return {
    nombre: row.nombre,
    tipo: row.tipo,
    estado: row.estado,
    valor: row.valor,
    dormitorios: row.dormitorios,
    banos: row.banos,
    m2_totales: row.m2_totales,
    m2_cubiertos: row.m2_cubiertos,
    direccion: row.direccion,
    ubicacion_texto: row.ubicacion_texto,
    imageSrc: row.imagen_principal,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: PropiedadListRow | null;
};

export function PropiedadVistaPreviaDialog({ open, onOpenChange, propiedad }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {propiedad ? (
        <DialogContent
          showCloseButton={false}
          className="max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 overflow-y-auto overflow-x-hidden border-stone-200/80 p-0 shadow-xl sm:w-full"
        >
          <PropiedadPreviewContent
            data={rowToPreview(propiedad)}
            overlay={
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-9 rounded-full border border-white/50 bg-white/92 text-stone-700 shadow-md backdrop-blur-sm hover:bg-white"
                  aria-label="Cerrar vista previa"
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
