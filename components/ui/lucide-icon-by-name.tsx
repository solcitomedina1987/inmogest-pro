import type { ComponentType } from "react";
import * as LucideIcons from "lucide-react";

type Props = {
  name: string | null | undefined;
  className?: string;
};

/** Lucide exporta iconos como `forwardRef` → en React 19 `typeof` es `"object"`, no `"function"`. */
function isLucideIconComponent(x: unknown): x is ComponentType<{ className?: string }> {
  if (x == null) return false;
  if (typeof x === "function") return true;
  if (typeof x === "object" && "$$typeof" in x && "render" in x && typeof (x as { render: unknown }).render === "function") {
    return true;
  }
  return false;
}

export function toLucideExportName(raw: string): string {
  const t = raw.trim();
  if (!t) return "Circle";
  return t
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/** Variantes de nombre típicas en BD (PascalCase Lucide, slug, etc.). */
export function iconLookupCandidates(raw: string): string[] {
  const t = raw.trim();
  if (!t) return ["Circle"];
  const partPascal = toLucideExportName(t);
  const title = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  const camelSplit = t
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return [...new Set([t, partPascal, title, camelSplit].filter(Boolean))];
}

function resolveLucideIcon(exportName: string): ComponentType<{ className?: string }> | null {
  const key = exportName as keyof typeof LucideIcons;
  const Icon = LucideIcons[key];
  if (!isLucideIconComponent(Icon)) return null;
  return Icon;
}

function resolveLucideIconFromDbString(raw: string | null | undefined): ComponentType<{ className?: string }> | null {
  for (const candidate of iconLookupCandidates(raw ?? "")) {
    const Icon = resolveLucideIcon(candidate);
    if (Icon) return Icon;
  }
  return null;
}

/** True si el nombre (tras normalizar) corresponde a un componente de icono de `lucide-react`. */
export function isKnownLucideIconName(name: string | null | undefined): boolean {
  return resolveLucideIconFromDbString(name) != null;
}

/**
 * Renderiza un icono de `lucide-react` a partir del nombre guardado (p. ej. "Hammer", "arrow-right").
 * Si no existe coincidencia, muestra `HelpCircle` (no el texto del string).
 */
export function LucideIconByName({ name, className }: Props) {
  const Icon = resolveLucideIconFromDbString(name);
  if (!Icon) {
    return <LucideIcons.HelpCircle className={className} aria-hidden />;
  }
  return <Icon className={className} aria-hidden />;
}
