/** Evita redirecciones abiertas: solo rutas relativas internas. */
export function safeRedirectPath(path: string | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}
