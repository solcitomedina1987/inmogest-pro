"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { isDashboardSameSection } from "@/components/dashboard/dashboard-nav-utils";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const nav = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/propiedades", label: "Propiedades" },
  { href: "/dashboard/proveedores", label: "Proveedores" },
  { href: "/dashboard/cobranzas", label: "Cobranzas" },
  { href: "/dashboard/contratos", label: "Contratos" },
] as const;

type Props = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-muted/30 flex min-h-screen print:min-h-0 print:bg-white">
      <Toaster richColors position="top-center" closeButton />
      <aside className="bg-card flex w-56 shrink-0 flex-col border-r border-border print:hidden">
        <div className="border-b border-border px-3 py-5">
          <div className="flex justify-center">
            <BrandLogo className="w-full max-w-[231.25px] max-h-[3.4375rem] min-w-0 object-contain" />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                if (isDashboardSameSection(pathname, item.href)) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                startTransition(() => {
                  router.push(item.href);
                });
              }}
              className={cn(
                "text-foreground rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                isDashboardSameSection(pathname, item.href) && "bg-muted font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col print:w-full">
        {isPending ? (
          <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-sm print:hidden"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="text-primary size-9 animate-spin" aria-hidden />
            <span className="text-muted-foreground text-sm font-medium">Cargando…</span>
            <span className="sr-only">Cargando la sección del panel</span>
          </div>
        ) : null}
        <main className="relative flex-1 p-8 print:p-4 print:pt-2">{children}</main>
      </div>
    </div>
  );
}
