import Link from "next/link";
import { Building2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
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
            <BrandLogo className="h-6 max-w-[200px] w-auto object-contain object-left" />
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
