import type { Metadata } from "next";
import { CalendarView } from "@/components/dashboard/calendar-view";

export const metadata: Metadata = {
  title: "Calendario",
};

export default function CalendarioPage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground text-sm">
          Vencimientos y actualizaciones de contratos sincronizados con Google Calendar.
        </p>
      </header>

      <CalendarView />
    </div>
  );
}
