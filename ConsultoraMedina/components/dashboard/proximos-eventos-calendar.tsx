/**
 * Widget Server Component — Próximos eventos de Google Calendar.
 * Muestra los próximos 5 eventos de vencimiento y actualización de alquileres.
 * Si Google Calendar no está configurado, el widget se oculta silenciosamente.
 */

import { CalendarClock, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { obtenerProximosEventos, googleCalendarConfigurado } from "@/lib/google/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

function formatFechaISO(iso: string): string {
  // iso = YYYY-MM-DD (evento de día completo)
  if (!iso) return "—";
  // Parsear como fecha local para evitar desfase UTC
  const [y, m, d] = iso.split("-").map(Number);
  return fechaFmt.format(new Date(y, m - 1, d));
}

function normalizarTelefono(tel: string | null): string | null {
  if (!tel) return null;
  // Quitar espacios, paréntesis, guiones y garantizar formato wa.me compatible
  const limpio = tel.replace(/[\s\-().+]/g, "");
  // Si empieza con 549 ya está ok; si empieza con 0 reemplazar por 549
  if (limpio.startsWith("549")) return limpio;
  if (limpio.startsWith("54")) return limpio;
  if (limpio.startsWith("0")) return `549${limpio.slice(1)}`;
  return `549${limpio}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

export async function ProximosEventosCalendar() {
  // No renderizar nada si las credenciales no están configuradas
  if (!googleCalendarConfigurado()) return null;

  let eventos;
  try {
    eventos = await obtenerProximosEventos(5);
  } catch {
    // Error de conexión — mostrar aviso sin romper el layout
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="text-muted-foreground size-5" />
            <CardTitle className="text-lg">Próximos eventos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>No se pudo conectar con Google Calendar. Verificar credenciales.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (eventos.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="text-muted-foreground size-5" />
            <CardTitle className="text-lg">Próximos eventos</CardTitle>
          </div>
          <CardDescription>Alertas de vencimientos y actualizaciones de contratos.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            No hay eventos próximos en el calendario.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="text-muted-foreground size-5" />
          <CardTitle className="text-lg">Próximos eventos</CardTitle>
        </div>
        <CardDescription>
          Próximas alertas de vencimiento y actualización de alquileres sincronizadas con Google
          Calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {eventos.map((ev) => {
            const telLimpio = normalizarTelefono(ev.telefono);
            const waLink = telLimpio ? `https://wa.me/${telLimpio}` : null;

            return (
              <li key={ev.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                {/* Tipo + fecha */}
                <div className="flex flex-wrap items-center gap-2">
                  {ev.tipo === "vencimiento_real" ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/60 bg-red-50 text-red-700 dark:bg-red-950/40"
                    >
                      <AlertCircle className="mr-1 size-3" />
                      Vencimiento contrato
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                    >
                      <RefreshCw className="mr-1 size-3" />
                      Actualización alquiler
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatFechaISO(ev.fecha)}
                  </span>
                </div>

                {/* Dirección e inquilino */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight">{ev.direccion}</span>
                    <span className="text-muted-foreground text-xs">{ev.inquilino}</span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/50 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                        aria-label={`WhatsApp a ${ev.inquilino}`}
                      >
                        {/* Icono WhatsApp SVG inline (sin dependencia externa) */}
                        <svg
                          className="size-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        Avisar
                      </a>
                    ) : null}

                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
                      aria-label="Ver en Google Calendar"
                    >
                      <ExternalLink className="size-3" />
                      Ver
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
