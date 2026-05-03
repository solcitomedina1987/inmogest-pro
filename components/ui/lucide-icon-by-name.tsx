import type { ComponentType } from "react";
import * as LucideIcons from "lucide-react";

type Props = {
  name: string | null | undefined;
  className?: string;
};

export function toLucideExportName(raw: string): string {
  const t = raw.trim();
  if (!t) return "Circle";
  return t
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function resolveLucideIcon(exportName: string): ComponentType<{ className?: string }> | null {
  const key = exportName as keyof typeof LucideIcons;
  const Icon = LucideIcons[key] as ComponentType<{ className?: string }> | undefined;
  if (!Icon || typeof Icon !== "function") return null;
  return Icon;
}

/** True si el nombre (tras normalizar) corresponde a un componente de icono de `lucide-react`. */
export function isKnownLucideIconName(name: string | null | undefined): boolean {
  return resolveLucideIcon(toLucideExportName(name ?? "")) != null;
}

/**
 * Renderiza un icono de `lucide-react` a partir del nombre guardado (p. ej. "Hammer", "arrow-right").
 * Si no existe coincidencia, muestra `HelpCircle` (no el texto del string).
 */
export function LucideIconByName({ name, className }: Props) {
  const exportName = toLucideExportName(name ?? "");
  const Icon = resolveLucideIcon(exportName);
  if (!Icon) {
    return <LucideIcons.HelpCircle className={className} aria-hidden />;
  }
  return <Icon className={className} aria-hidden />;
}
