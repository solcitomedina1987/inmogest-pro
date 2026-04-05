"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
  MessageCircle,
  MapPin,
  User,
  CalendarIcon,
  Clock,
} from "lucide-react";
import type { EventoCalendario, TipoEvento } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";

// ── Utilitarios de fecha ──────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(ref: Date): Date[] {
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const start = startOfWeek(firstDay);
  const end = new Date(lastDay);
  const lastDow = end.getDay();
  if (lastDow !== 0) end.setDate(end.getDate() + (7 - lastDow));
  const days: Date[] = [];
  let cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur = addDays(cur, 1); }
  return days;
}

function buildWeekDays(ref: Date): Date[] {
  const mon = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

function diasRestantes(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - hoy.getTime()) / 86_400_000);
}

// ── Colores por tipo ──────────────────────────────────────────────────────────

function eventStyle(tipo: TipoEvento) {
  if (tipo === "vencimiento_real") {
    return {
      pill: "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      dot: "bg-rose-600",
      dialogHeader: "bg-rose-600 text-white",
      badge: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
      label: "🔴 Vencimiento Contrato",
      dotCard: "border-l-rose-500",
    };
  }
  if (tipo === "alerta_vencimiento") {
    return {
      pill: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      dot: "bg-amber-400",
      dialogHeader: "bg-amber-500 text-white",
      badge: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      label: "⚠️ Alerta: Contrato próximo a vencer",
      dotCard: "border-l-amber-400",
    };
  }
  if (tipo === "actualizacion") {
    return {
      pill: "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
      dot: "bg-blue-600",
      dialogHeader: "bg-blue-600 text-white",
      badge: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
      label: "🔵 Actualización de Alquiler",
      dotCard: "border-l-blue-600",
    };
  }
  // alerta_actualizacion — celeste
  return {
    pill: "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    dot: "bg-sky-400",
    dialogHeader: "bg-sky-500 text-white",
    badge: "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    label: "🔔 Alerta: Actualización próxima",
    dotCard: "border-l-sky-400",
  };
}

// ── Formateo ──────────────────────────────────────────────────────────────────

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_CORTO = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DIAS_LARGO = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric", month: "long", year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0,
});

function formatDateISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return fechaFmt.format(new Date(y, m - 1, d));
}

function normTel(tel: string | null): string | null {
  if (!tel) return null;
  const c = tel.replace(/[\s\-().+]/g, "");
  if (c.startsWith("54")) return c;
  if (c.startsWith("0")) return `549${c.slice(1)}`;
  return `549${c}`;
}

// ── Helpers de mensajes WhatsApp ─────────────────────────────────────────────

function waMessage(tipo: TipoEvento, nombre: string, direccion: string, indice?: string): string {
  const primerNombre = nombre.split(" ")[0] ?? nombre;
  if (tipo === "actualizacion" || tipo === "alerta_actualizacion") {
    return (
      `Hola ${primerNombre} 👋, le contactamos desde *Consultora Medina & Asociados*. ` +
      `Le informamos que corresponde actualizar el valor del alquiler en *${direccion}* ` +
      `según el índice ${indice ?? "IPC/ICL"}. ` +
      `Nos pondremos en contacto con el nuevo valor. Consultas al +54 9 2664 791345.`
    );
  }
  return (
    `Hola ${primerNombre} 👋, le contactamos desde *Consultora Medina & Asociados*. ` +
    `Le informamos que el contrato de alquiler en *${direccion}* se encuentra ` +
    `próximo a su vencimiento. Le pedimos que se comunique a la brevedad. ` +
    `Consultas al +54 9 2664 791345.`
  );
}

// ── Dialog de detalle enriquecido ─────────────────────────────────────────────

function EventDetailDialog({
  event,
  onClose,
}: {
  event: EventoCalendario | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const st = eventStyle(event.tipo);
  const tel = normTel(event.telefono);
  const diasR = event.fechaVencimiento ? diasRestantes(event.fechaVencimiento) : null;
  const diasREvento = event.tipo === "vencimiento_real" ? diasRestantes(event.fecha) : null;

  // Mensaje WhatsApp pre-cargado
  const waText = event.inquilino
    ? waMessage(event.tipo, event.inquilino, event.direccion, event.indice)
    : null;
  const waHref =
    tel && waText
      ? `https://wa.me/${tel}?text=${encodeURIComponent(waText)}`
      : tel
        ? `https://wa.me/${tel}`
        : null;

  // Texto del contexto por tipo
  const contextInfo = (() => {
    if (event.tipo === "vencimiento_real" && diasREvento !== null) {
      if (diasREvento > 0)
        return { icon: "⏳", text: `${diasREvento} día${diasREvento !== 1 ? "s" : ""} para el vencimiento` };
      if (diasREvento === 0) return { icon: "🚨", text: "El contrato vence hoy" };
      return { icon: "⛔", text: `Vencido hace ${Math.abs(diasREvento)} día${Math.abs(diasREvento) !== 1 ? "s" : ""}` };
    }
    if (event.tipo === "alerta_vencimiento" && event.fechaVencimiento) {
      const d = diasR ?? 0;
      return {
        icon: "📅",
        text:
          d > 0
            ? `Vence el ${formatDateISO(event.fechaVencimiento)} — ${d} días restantes`
            : `Vence el ${formatDateISO(event.fechaVencimiento)}`,
      };
    }
    if (event.tipo === "actualizacion" || event.tipo === "alerta_actualizacion") {
      const partes = [
        event.indice ? `Índice: ${event.indice}` : null,
        event.montoMensual != null
          ? `Monto actual: ${precioFmt.format(event.montoMensual)}`
          : null,
      ].filter(Boolean);
      const base = partes.join(" · ") || "Actualización de valor";
      return {
        icon: event.tipo === "alerta_actualizacion" ? "🔔" : "📊",
        text: event.tipo === "alerta_actualizacion" ? `Próxima actualización — ${base}` : base,
      };
    }
    return null;
  })();

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm overflow-hidden p-0 sm:max-w-md">

        {/* ── Header coloreado ── */}
        <div className={cn("relative px-5 pb-4 pt-5", st.dialogHeader)}>
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>

          <DialogHeader className="space-y-1 pr-8">
            <DialogTitle className="text-base font-semibold leading-tight text-white">
              {st.label}
            </DialogTitle>
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
              {formatDateISO(event.fecha)}
            </p>
          </DialogHeader>
        </div>

        {/* ── Cuerpo ── */}
        <div className="flex flex-col gap-0 divide-y px-0">

          {/* Fila: Propiedad */}
          <div className="flex items-start gap-3 px-5 py-3">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                Propiedad
              </p>
              {event.contratoId ? (
                <a
                  href={`/dashboard/cobranzas/${event.contratoId}`}
                  className="mt-0.5 block font-medium leading-snug underline-offset-2 hover:underline"
                  onClick={onClose}
                >
                  {event.direccion || "—"}
                </a>
              ) : (
                <p className="mt-0.5 font-medium leading-snug">{event.direccion || "—"}</p>
              )}
            </div>
          </div>

          {/* Fila: Inquilino */}
          <div className="flex items-start gap-3 px-5 py-3">
            <User className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                Inquilino
              </p>
              <p className="mt-0.5 font-medium">{event.inquilino || "—"}</p>
              {event.telefono ? (
                <p className="text-muted-foreground mt-0.5 text-xs">{event.telefono}</p>
              ) : null}
            </div>
          </div>

          {/* Fila: Fecha clave */}
          <div className="flex items-start gap-3 px-5 py-3">
            <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                Fecha del evento
              </p>
              <p className="mt-0.5 font-medium">{formatDateISO(event.fecha)}</p>
            </div>
          </div>

          {/* Caja de contexto */}
          {contextInfo ? (
            <div className={cn("mx-5 my-3 rounded-lg border px-4 py-3", st.badge)}>
              <p className="text-sm font-medium">
                {contextInfo.icon} {contextInfo.text}
              </p>
            </div>
          ) : null}

          {/* ── Botón WhatsApp ── */}
          {waHref ? (
            <div className="px-5 pb-4 pt-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-3",
                  "bg-[#25D366] text-white font-semibold text-sm shadow-sm",
                  "transition-all hover:bg-[#1ebe5d] hover:shadow-md active:scale-[0.98]",
                )}
              >
                <MessageCircle className="size-5" aria-hidden />
                Enviar aviso por WhatsApp
              </a>
              {event.htmlLink ? (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground mx-auto mt-2 flex w-fit items-center gap-1.5 text-xs transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Ver en Google Calendar
                </a>
              ) : null}
            </div>
          ) : event.htmlLink ? (
            <div className="px-5 pb-4 pt-3">
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Ver en Google Calendar
              </a>
            </div>
          ) : null}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── EventPill ─────────────────────────────────────────────────────────────────

function EventPill({
  event,
  compact,
  onClick,
}: {
  event: EventoCalendario;
  compact?: boolean;
  onClick: (ev: EventoCalendario) => void;
}) {
  const st = eventStyle(event.tipo);
  const label =
    event.tipo === "vencimiento_real"
      ? compact ? "Vcto." : "Vencimiento"
      : event.tipo === "actualizacion"
        ? compact ? "Act." : "Actualización"
        : compact ? "⚠️ Alerta" : "⚠️ Alerta Vcto.";

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={cn(
        "flex min-w-0 w-full cursor-pointer items-center gap-1 rounded px-1 py-0.5",
        "text-[10px] font-medium leading-tight truncate text-left transition-opacity hover:opacity-80",
        st.pill,
      )}
      title={`${st.label}: ${event.direccion}`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", st.dot)} aria-hidden />
      <span className="truncate">{compact ? label : `${label}: ${event.direccion}`}</span>
    </button>
  );
}

// ── EventCard (vista semana) ──────────────────────────────────────────────────

function EventCard({
  event,
  onClick,
}: {
  event: EventoCalendario;
  onClick: (ev: EventoCalendario) => void;
}) {
  const st = eventStyle(event.tipo);
  const tel = normTel(event.telefono);

  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs border-l-4",
        st.badge,
        st.dotCard,
      )}
    >
      <button
        type="button"
        onClick={() => onClick(event)}
        className="block w-full text-left"
      >
        <p className="font-semibold leading-snug">{st.label}</p>
        <p className="mt-0.5 truncate opacity-80">{event.direccion}</p>
        {event.inquilino ? <p className="truncate opacity-70">{event.inquilino}</p> : null}
      </button>
      {tel ? (
        <a
          href={`https://wa.me/${tel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Avisar
        </a>
      ) : null}
    </div>
  );
}

// ── Vista Mes ─────────────────────────────────────────────────────────────────

function MonthView({
  refDate,
  events,
  today,
  onEventClick,
}: {
  refDate: Date;
  events: EventoCalendario[];
  today: Date;
  onEventClick: (ev: EventoCalendario) => void;
}) {
  const grid = buildMonthGrid(refDate);
  const byDate = new Map<string, EventoCalendario[]>();
  for (const ev of events) {
    if (!ev.fecha) continue;
    const arr = byDate.get(ev.fecha) ?? [];
    arr.push(ev);
    byDate.set(ev.fecha, arr);
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {DIAS_CORTO.map((d) => (
          <div key={d} className="text-muted-foreground py-2 text-center text-xs font-medium tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day) => {
          const iso = toISO(day);
          const dayEvents = byDate.get(iso) ?? [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, refDate);
          const maxVisible = 2;
          const overflow = dayEvents.length - maxVisible;

          return (
            <div
              key={iso}
              className={cn(
                "border-b border-r min-h-[88px] p-1 flex flex-col gap-0.5",
                !isCurrentMonth && "bg-muted/25",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, maxVisible).map((ev) => (
                <EventPill key={ev.id} event={ev} compact onClick={onEventClick} />
              ))}
              {overflow > 0 ? (
                <span className="text-muted-foreground px-1 text-[10px]">+{overflow} más</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista Semana ──────────────────────────────────────────────────────────────

function WeekView({
  refDate,
  events,
  today,
  onEventClick,
}: {
  refDate: Date;
  events: EventoCalendario[];
  today: Date;
  onEventClick: (ev: EventoCalendario) => void;
}) {
  const days = buildWeekDays(refDate);
  const byDate = new Map<string, EventoCalendario[]>();
  for (const ev of events) {
    if (!ev.fecha) continue;
    const arr = byDate.get(ev.fecha) ?? [];
    arr.push(ev);
    byDate.set(ev.fecha, arr);
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-7">
        {days.map((day, i) => {
          const iso = toISO(day);
          const dayEvents = byDate.get(iso) ?? [];
          const isToday = isSameDay(day, today);

          return (
            <div key={iso} className={cn("border-r last:border-r-0", isToday && "bg-primary/5")}>
              <div className={cn("flex flex-col items-center border-b py-2", isToday && "border-primary/30")}>
                <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                  {DIAS_LARGO[i].slice(0, 3)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-1.5 min-h-[140px]">
                {dayEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

type FetchState = "idle" | "loading" | "error" | "ok" | "unconfigured";

export function CalendarView({ refreshToken }: { refreshToken?: number } = {}) {
  const today = useRef(new Date()).current;
  const [refDate, setRefDate] = useState(() => new Date(today));
  const [view, setView] = useState<ViewMode>("month");
  const [events, setEvents] = useState<EventoCalendario[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventoCalendario | null>(null);

  const getRange = useCallback(
    (date: Date, v: ViewMode): { start: string; end: string } => {
      if (v === "week") {
        const mon = startOfWeek(date);
        return { start: toISO(mon), end: toISO(addDays(mon, 6)) };
      }
      const firstCell = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
      return { start: toISO(firstCell), end: toISO(addDays(firstCell, 41)) };
    },
    [],
  );

  const fetchEvents = useCallback(
    async (date: Date, v: ViewMode) => {
      setStatus("loading");
      const { start, end } = getRange(date, v);
      try {
        const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`);
        const json = (await res.json()) as {
          events?: EventoCalendario[];
          configured?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Error al obtener eventos");
        if (json.configured === false) { setStatus("unconfigured"); setEvents([]); return; }
        setEvents(json.events ?? []);
        setStatus("ok");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error de conexión");
        setStatus("error");
      }
    },
    [getRange],
  );

  useEffect(() => { fetchEvents(refDate, view); }, [refDate, view, fetchEvents, refreshToken]);

  function prev() {
    if (view === "month") setRefDate((d) => addMonths(d, -1));
    else setRefDate((d) => addDays(startOfWeek(d), -7));
  }
  function next() {
    if (view === "month") setRefDate((d) => addMonths(d, 1));
    else setRefDate((d) => addDays(startOfWeek(d), 7));
  }
  function goToday() { setRefDate(new Date(today)); }

  const title = (() => {
    if (view === "month") return `${MESES[refDate.getMonth()]} ${refDate.getFullYear()}`;
    const mon = startOfWeek(refDate);
    const sun = addDays(mon, 6);
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()} – ${sun.getDate()} de ${MESES[mon.getMonth()]} ${mon.getFullYear()}`;
    }
    return `${mon.getDate()} ${MESES[mon.getMonth()].slice(0, 3)} – ${sun.getDate()} ${MESES[sun.getMonth()].slice(0, 3)} ${sun.getFullYear()}`;
  })();

  return (
    <>
      <div className="flex flex-col gap-0 overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={prev} aria-label="Anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={next} aria-label="Siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <h2 className="flex-1 text-sm font-semibold tabular-nums sm:text-base">{title}</h2>

          <div className="flex items-center gap-2">
            {status === "loading" ? <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden /> : null}
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={goToday}>Hoy</Button>
            <div className="flex rounded-md border bg-muted/40 p-0.5">
              {(["month", "week"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "month" ? "Mes" : "Semana"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alertas */}
        {status === "error" ? (
          <div className="flex flex-col gap-1 border-b bg-destructive/5 px-4 py-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">Error al conectar con Google Calendar</span>
                <p className="mt-0.5 text-xs text-destructive/80 break-words">{errorMsg}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Usá el panel de diagnóstico (arriba) para identificar el problema exacto.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs" onClick={() => fetchEvents(refDate, view)}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : null}

        {status === "unconfigured" ? (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" />
            <span>Google Calendar no configurado. Completar las variables de entorno y usar &quot;Diagnosticar conexión&quot;.</span>
          </div>
        ) : null}

        {status === "ok" && events.length === 0 ? (
          <div className="flex items-center gap-2 border-b bg-blue-50/50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>No hay eventos en este período. Si ya configuraste Google Calendar, usá <strong>&quot;Sincronizar contratos&quot;</strong> para crear los eventos de los contratos existentes.</span>
          </div>
        ) : null}

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/20 px-4 py-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-rose-600" aria-hidden /> Vencimiento contrato
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-amber-400" aria-hidden /> Alerta vencimiento
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-blue-600" aria-hidden /> Actualización alquiler
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-sky-400" aria-hidden /> Alerta actualización
          </span>
        </div>

        {/* Vista */}
        <div className="relative min-h-[320px]">
          {status === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="text-primary size-6 animate-spin" aria-hidden />
            </div>
          ) : null}

          {view === "month" ? (
            <MonthView refDate={refDate} events={events} today={today} onEventClick={setSelectedEvent} />
          ) : (
            <WeekView refDate={refDate} events={events} today={today} onEventClick={setSelectedEvent} />
          )}
        </div>
      </div>

      {/* Dialog de detalle */}
      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
