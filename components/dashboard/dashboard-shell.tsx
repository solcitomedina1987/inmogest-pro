"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { isDashboardSameSection } from "@/components/dashboard/dashboard-nav-utils";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const baseNav = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/propiedades", label: "Propiedades" },
  { href: "/dashboard/proveedores", label: "Proveedores" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/cobranzas", label: "Cobranzas" },
  { href: "/dashboard/contratos", label: "Contratos" },
] as const;

const adminNavItem = { href: "/dashboard/admin-usuarios", label: "Usuarios" } as const;

type Props = {
  children: React.ReactNode;
  isAdmin?: boolean;
  isCliente?: boolean;
};

export function DashboardShell({ children, isAdmin = false, isCliente = false }: Props) {
  const navItems = isCliente ? baseNav.slice(0, 1) : baseNav;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string, afterNavigate?: () => void) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (isDashboardSameSection(pathname, href)) {
      e.preventDefault();
      afterNavigate?.();
      return;
    }
    e.preventDefault();
    startTransition(() => {
      router.push(href);
      afterNavigate?.();
    });
  }

  function NavLinks({ mobile }: { mobile?: boolean }) {
    const after = mobile ? () => setMobileOpen(false) : undefined;
    return (
      <nav className={cn("flex flex-col gap-1", mobile ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto p-3")}>
        {mobile ? (
          <div className="border-border mb-4 flex justify-center border-b pb-4">
            <Link
              href="/"
              className="inline-flex focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Ir al sitio público"
            >
              <BrandLogo className="max-h-10 max-w-[200px] min-w-0 object-contain" />
            </Link>
          </div>
        ) : null}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={(e) => handleNavClick(e, item.href, after)}
            className={cn(
              "text-foreground rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
              !mobile && isDashboardSameSection(pathname, item.href) && "bg-muted font-medium",
              mobile && isDashboardSameSection(pathname, item.href) && "bg-muted font-medium",
            )}
          >
            {item.label}
          </Link>
        ))}
        {isAdmin ? (
          <Link
            key={adminNavItem.href}
            href={adminNavItem.href}
            prefetch
            onClick={(e) => handleNavClick(e, adminNavItem.href, after)}
            className={cn(
              "text-foreground rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
              !mobile && isDashboardSameSection(pathname, adminNavItem.href) && "bg-muted font-medium",
              mobile && isDashboardSameSection(pathname, adminNavItem.href) && "bg-muted font-medium",
            )}
          >
            {adminNavItem.label}
          </Link>
        ) : null}
      </nav>
    );
  }

  return (
    <div className="bg-muted/30 flex min-h-screen max-w-full flex-col print:min-h-0 print:bg-white lg:flex-row">
      <Toaster richColors position="top-center" closeButton />

      <header className="bg-card sticky top-0 z-40 flex h-14 max-w-full shrink-0 items-center justify-between border-b px-4 print:hidden lg:hidden md:px-8">
        <Link
          href="/"
          className="inline-flex min-w-0 shrink focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Ir al sitio público"
        >
          <BrandLogo className="max-h-9 max-w-[min(200px,55vw)] min-w-0 object-contain" />
        </Link>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Abrir menú"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[min(100vw-1rem,20rem)] flex-col gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú del panel</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col p-4">
            <NavLinks mobile />
            <div className="border-border mt-auto border-t pt-4">
              <LogoutButton />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside className="bg-card hidden w-56 max-w-full shrink-0 flex-col border-r border-border print:hidden lg:flex">
        <div className="border-border border-b px-3 py-5">
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex w-full max-w-[346.875px] justify-center focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Ir al sitio público"
            >
              <BrandLogo className="w-full max-w-[346.875px] max-h-[5.15625rem] min-w-0 object-contain" />
            </Link>
          </div>
        </div>
        <NavLinks />
        <div className="border-border border-t p-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="relative flex min-w-0 max-w-full flex-1 flex-col print:w-full">
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
        <main className="relative max-w-full flex-1 px-4 py-6 md:px-8 lg:py-8 print:p-4 print:pt-2">
          {children}
        </main>
      </div>
    </div>
  );
}
