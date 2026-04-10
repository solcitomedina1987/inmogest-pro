import Link from "next/link";
import { Building2 } from "lucide-react";
import { BRAND_PORTAL_HEADER } from "@/lib/constants/branding";
import { LogoutButton } from "@/components/dashboard/logout-button";

type Props = {
  nombre?: string | null;
};

export function PropietarioHeader({ nombre }: Props) {
  return (
    <header className="border-b bg-card print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/propietarios/dashboard" className="inline-flex items-center gap-3 min-w-0">
          <Building2 className="size-7 shrink-0 text-sky-700" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight text-foreground text-lg leading-tight">
              {BRAND_PORTAL_HEADER}
            </p>
            <p className="text-muted-foreground truncate text-xs mt-0.5">
              Portal propietarios{nombre ? ` · ${nombre}` : ""}
            </p>
          </div>
        </Link>
        <div className="shrink-0">
          <LogoutButton className="w-auto justify-end" />
        </div>
      </div>
    </header>
  );
}
