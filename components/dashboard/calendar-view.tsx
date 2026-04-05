"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, AlertCircle } from "lucide-react";
import type { EventoCalendario } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
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

/** Lunes de la semana que contiene `d`. */
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

/** Retorna YYYY-MM-DD */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Calcula la grilla del mes: desde el lunes de la primera semana
 * hasta el domingo de la última, incluyendo días del mes anterior/siguiente.
 */
function buildMonthGrid(ref: Date): Date[] {
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);

  const start = startOfWeek(firstDay);

  // Domingo de la última semana
  const end = new Date(lastDay);
  const lastDow = end.getDay();
  if (lastDow !== 0) end.setDate(end.getDate() + (7 - lastDow));

  const days: Date[] = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

/** 7 días de lunes a domingo */
function buildWeekDays(ref: Date): Date[] {
  const mon = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

// ── Colores por tipo de evento ────────────────────────────────────────────────

function eventColor(tipo: EventoCalendario["tipo"]) {
  if (tipo === "vencimiento") {
    return {
      pill: "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
      dot: "bg-rose-500",
      badge: "bg-rose-500/15 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300",
    };
  }
  return {
    pill: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300",
  };
}

// ── Formateo ──────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function normalizarTel(tel: string | null): string | null {
  if (!tel) return null;
  const limpio = tel.replace(/[\s\-().+]/g, "");
  if (limpio.startsWith("54")) return limpio;
  if (limpio.startsWith("0")) return `549${limpio.slice(1)}`;
  return `549${limpio}`;
}

// ── Subcomponente: EventPill (chip compacto para la grilla de mes) ─────────────

function EventPill({
  event,
  compact,
}: {
  event: EventoCalendario;
  compact?: boolean;
}) {
  const col = eventColor(event.tipo);
  const tel = normalizarTel(event.tipo === "vencimiento" ? event.telefono : event.telefono);
  const label =
    event.tipo === "vencimiento"
      ? compact
        ? "Vcto."
        : "Vencimiento"
      : compact
        ? "Act."
        : "Actualización";

  const inner = (
    <span
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium leading-tight truncate",
        col.pill,
      )}
      title={`${event.tipo === "vencimiento" ? "Vencimiento Contrato" : "Actualización Alquiler"}: ${event.direccion} (${event.inquilino})`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", col.dot)} aria-hidden />
      <span className="truncate">{compact ? label : `${label}: ${event.direccion}`}</span>
    </span>
  );

  if (tel) {
    return (
      <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="block min-w-0">
        {inner}
      </a>
    );
  }
  return inner;
}

// ── Subcomponente: EventCard (tarjeta expandida para la vista semana) ──────────

function EventCard({ event }: { event: EventoCalendario }) {
  const col = eventColor(event.tipo);
  const tel = normalizarTel(event.telefono);

  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs",
        col.badge,
      )}
    >
      <p className="font-semibold leading-snug">
        {event.tipo === "vencimiento" ? "Vencimiento Contrato" : "Actualización Alquiler"}
      </p>
      <p className="mt-0.5 truncate opacity-80">{event.direccion}</p>
      {event.inquilino ? <p className="truncate opacity-70">{event.inquilino}</p> : null}
      {tel ? (
        <a
          href={`https://wa.me/${tel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
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
}: {
  refDate: Date;
  events: EventoCalendario[];
  today: Date;
}) {
  const grid = buildMonthGrid(refDate);

  // Indexar eventos por fecha ISO
  const byDate = new Map<string, EventoCalendario[]>();
  for (const ev of events) {
    if (!ev.fecha) continue;
    const arr = byDate.get(ev.fecha) ?? [];
    arr.push(ev);
    byDate.set(ev.fecha, arr);
  }

  return (
    <div className="min-w-0 overflow-hidden">
      {/* Cabecera de días */}
      <div className="grid grid-cols-7 border-b">
        {DIAS_CORTO.map((d) => (
          <div
            key={d}
            className="text-muted-foreground py-2 text-center text-xs font-medium tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
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
                !isCurrentMonth && "bg-muted/30",
              )}
            >
              {/* Número del día */}
              <span
                className={cn(
                  "mb-0.5 flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {day.getDate()}
              </span>

              {/* Eventos */}
              {dayEvents.slice(0, maxVisible).map((ev) => (
                <EventPill key={ev.id} event={ev} compact />
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
}: {
  refDate: Date;
  events: EventoCalendario[];
  today: Date;
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
              {/* Cabecera del día */}
              <div
                className={cn(
                  "flex flex-col items-center border-b py-2",
                  isToday && "border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
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

              {/* Eventos del día */}
              <div className="flex flex-col gap-1 p-1.5 min-h-[140px]">
                {dayEvents.length === 0 ? null : (
                  dayEvents.map((ev) => <EventCard key={ev.id} event={ev} />)
                )}
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

export function CalendarView() {
  const today = useRef(new Date()).current;
  const [refDate, setRefDate] = useState(() => new Date(today));
  const [view, setView] = useState<ViewMode>("month");
  const [events, setEvents] = useState<EventoCalendario[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Calcular rango a fetchear según la vista
  const getRange = useCallback(
    (date: Date, v: ViewMode): { start: string; end: string } => {
      if (v === "week") {
        const mon = startOfWeek(date);
        const sun = addDays(mon, 6);
        return { start: toISO(mon), end: toISO(sun) };
      }
      // month: traer un poco extra para la grilla padding
      const firstCell = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
      const lastCell = addDays(firstCell, 41); // max 6 semanas
      return { start: toISO(firstCell), end: toISO(lastCell) };
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
        if (json.configured === false) {
          setStatus("unconfigured");
          setEvents([]);
          return;
        }
        setEvents(json.events ?? []);
        setStatus("ok");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error de conexión");
        setStatus("error");
      }
    },
    [getRange],
  );

  useEffect(() => {
    fetchEvents(refDate, view);
  }, [refDate, view, fetchEvents]);

  // Navegación
  function prev() {
    if (view === "month") setRefDate((d) => addMonths(d, -1));
    else setRefDate((d) => addDays(startOfWeek(d), -7));
  }
  function next() {
    if (view === "month") setRefDate((d) => addMonths(d, 1));
    else setRefDate((d) => addDays(startOfWeek(d), 7));
  }
  function goToday() {
    setRefDate(new Date(today));
  }

  // Título del período visible
  const title = (() => {
    if (view === "month") {
      return `${MESES[refDate.getMonth()]} ${refDate.getFullYear()}`;
    }
    const mon = startOfWeek(refDate);
    const sun = addDays(mon, 6);
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()} – ${sun.getDate()} de ${MESES[mon.getMonth()]} ${mon.getFullYear()}`;
    }
    return `${mon.getDate()} ${MESES[mon.getMonth()].slice(0, 3)} – ${sun.getDate()} ${MESES[sun.getMonth()].slice(0, 3)} ${sun.getFullYear()}`;
  })();

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={prev}
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={next}
            aria-label="Período siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="flex-1 text-sm font-semibold tabular-nums sm:text-base">{title}</h2>

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 px-2.5"
            onClick={goToday}
          >
            Hoy
          </Button>

          {/* Toggle de vista */}
          <div className="flex rounded-md border bg-muted/40 p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Estado de error / sin config ── */}
      {status === "error" ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-destructive border-b bg-destructive/5">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => fetchEvents(refDate, view)}
          >
            Reintentar
          </Button>
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground border-b bg-muted/30">
          <CalendarDays className="size-4 shrink-0" />
          <span>
            Google Calendar no está configurado. El calendario se muestra localmente sin eventos.
          </span>
        </div>
      ) : null}

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full bg-rose-500" aria-hidden />
          Vencimiento contrato
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full bg-amber-400" aria-hidden />
          Actualización alquiler
        </span>
      </div>

      {/* ── Vista ── */}
      <div className="relative min-h-[320px]">
        {status === "loading" ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="text-primary size-6 animate-spin" aria-hidden />
          </div>
        ) : null}

        {view === "month" ? (
          <MonthView refDate={refDate} events={events} today={today} />
        ) : (
          <WeekView refDate={refDate} events={events} today={today} />
        )}
      </div>
    </div>
  );
}
