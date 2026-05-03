"use client";

import { LucideIconByName, iconLookupCandidates } from "@/components/ui/lucide-icon-by-name";
import { CONCEPTO_PAGO_LUCIDE_ICON_PRESETS } from "@/lib/admin/concepto-pago-icon-presets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  idPrefix: string;
  value: string;
  onChange: (next: string) => void;
};

export function ConceptoIconPicker({ idPrefix, value, onChange }: Props) {
  const inputId = `${idPrefix}-icono-custom`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div
          className="bg-muted/50 flex size-[52px] shrink-0 items-center justify-center rounded-lg border border-border"
          aria-hidden
        >
          <LucideIconByName name={value} className="text-muted-foreground size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={inputId} className="text-sm">
            Nombre del icono (Lucide)
          </Label>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Hammer"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">Vista previa: se actualiza al escribir o al elegir abajo.</p>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">Iconos sugeridos</p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {CONCEPTO_PAGO_LUCIDE_ICON_PRESETS.map((name) => {
            const selected = iconLookupCandidates(value).includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={cn(
                  "hover:bg-muted flex size-10 items-center justify-center rounded-md border transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-primary ring-2 ring-offset-1 ring-offset-background"
                    : "border-border bg-background",
                )}
                aria-label={`Usar icono ${name}`}
                aria-pressed={selected}
              >
                <LucideIconByName name={name} className="text-muted-foreground size-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
