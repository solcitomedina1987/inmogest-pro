import type { PerfilRol } from "@/lib/roles";

/** Destino por defecto tras login según rol (sin redirect explícito en query). */
export function homePathForRol(rol: string | undefined | null): string {
  if (rol === "admin") return "/dashboard";
  if (rol === "propietario") return "/propietarios/dashboard";
  return "/portal";
}

/** Valida que un redirect guardado sea coherente con el rol (evita saltos entre portales). */
export function redirectAllowedForRol(path: string, rol: PerfilRol | string): boolean {
  if (!path.startsWith("/")) return false;
  if (rol === "admin") {
    return path.startsWith("/dashboard") || path.startsWith("/login");
  }
  if (rol === "propietario") {
    return path.startsWith("/propietarios") || path.startsWith("/login");
  }
  if (rol === "cliente") {
    return path.startsWith("/portal") || path.startsWith("/login");
  }
  return false;
}
