"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Dispara la preparación del recibo e impresión (padre monta ReciboAlquiler y llama window.print). */
  onPrint: () => void;
  disabled?: boolean;
};

export function ReciboPrintButton({ onPrint, disabled }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={disabled}
      onClick={() => {
        onPrint();
      }}
    >
      <Printer className="size-3.5 shrink-0" aria-hidden />
      Imprimir recibo
    </Button>
  );
}
