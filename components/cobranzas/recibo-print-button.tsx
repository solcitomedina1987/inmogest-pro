"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onPrint: () => void;
  disabled?: boolean;
  /** Muestra solo el ícono (sin texto), para usar dentro de la tabla con Tooltip externo. */
  iconOnly?: boolean;
};

export function ReciboPrintButton({ onPrint, disabled, iconOnly = false }: Props) {
  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-stone-500 hover:text-stone-800"
        disabled={disabled}
        onClick={onPrint}
        aria-label="Imprimir recibo"
      >
        <Printer className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={disabled}
      onClick={onPrint}
    >
      <Printer className="size-3.5 shrink-0" aria-hidden />
      Imprimir recibo
    </Button>
  );
}
