"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/constants/branding";

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
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-8">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-primary">{BRAND_NAME}</span>
          <span className="text-[11px] text-muted-foreground">Portal de Inquilinos</span>
        </div>

        <div className="flex items-center gap-3">
          {nombreInquilino && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              {nombreInquilino}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={loading}
            onClick={handleLogout}
          >
            {loading
              ? <Loader2 className="size-4 animate-spin" aria-hidden />
              : <LogOut className="size-4" aria-hidden />}
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
