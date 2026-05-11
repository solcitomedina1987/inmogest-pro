"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogoutButtonProps = { className?: string };

export function LogoutButton({ className }: LogoutButtonProps = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "text-muted-foreground hover:text-foreground gap-2 px-3 w-full justify-start",
        className,
      )}
      disabled={loading}
      onClick={handleLogout}
    >
      <LogOut className="size-4 shrink-0" />
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
