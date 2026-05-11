import type { ComponentType } from "react";
import {
  Building2,
  CirclePlus,
  ClockAlert,
  Flame,
  House,
  KeyRound,
  Lightbulb,
  Package,
  PenLine,
  PiggyBank,
  Wrench,
  Zap,
  Globe,
} from "lucide-react";
import type { ConceptoRendicionKey } from "@/lib/informes/rendicion-types";
import { cn } from "@/lib/utils";

const ICONS: Record<ConceptoRendicionKey, ComponentType<{ className?: string }>> = {
  alquiler: House,
  arreglos: Wrench,
  compra_materiales: Package,
  deposito_garantia: PiggyBank,
  escribania: PenLine,
  gas: Flame,
  honorarios_inmobiliarios: KeyRound,
  honorarios_tecnicos: Zap,
  intereses_mora: ClockAlert,
  luz: Lightbulb,
  otros_servicios: Globe,
  servicios_municipales: Building2,
  otros: CirclePlus,
};

export { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";

/** Icono Lucide por concepto (misma familia que acciones UI de cobranzas). */
export function ConceptoRendicionLucideIcon({
  conceptoKey,
  className,
}: {
  conceptoKey: ConceptoRendicionKey;
  className?: string;
}) {
  const Icon = ICONS[conceptoKey] ?? CirclePlus;
  return <Icon className={cn("size-4 shrink-0 text-stone-600", className)} aria-hidden />;
}
