"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_PORTAL_HEADER } from "@/lib/constants/branding";
import { Button } from "@/components/ui/button";
type Props = {
  nombreInquilino?: string;
};

export function PortalHeader({ nombreInquilino }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/portal" className="inline-flex min-w-0 items-center gap-3">
          <UserRound className="size-7 shrink-0 text-emerald-700" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight text-foreground text-lg leading-tight">
              {BRAND_PORTAL_HEADER}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              Portal inquilinos{nombreInquilino ? ` · ${nombreInquilino}` : ""}
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={loading}
            onClick={handleLogout}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
