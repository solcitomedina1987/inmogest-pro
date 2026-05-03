import type { ComponentType } from "react";
import * as LucideIcons from "lucide-react";

type Props = {
  name: string | null | undefined;
  className?: string;
};

function toLucideExportName(raw: string): string {
  const t = raw.trim();
  if (!t) return "Circle";
  return t
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/**
 * Resuelve un nombre de export de `lucide-react` (p. ej. "Home", "arrow-right") al componente de icono.
 * Si no existe, muestra `Circle`.
 */
export function LucideIconByName({ name, className }: Props) {
  const exportName = toLucideExportName(name ?? "");
  const key = exportName as keyof typeof LucideIcons;
  const Icon = LucideIcons[key] as ComponentType<{ className?: string }> | undefined;
  if (!Icon || typeof Icon !== "function") {
    return <LucideIcons.Circle className={className} aria-hidden />;
  }
  return <Icon className={className} aria-hidden />;
}
