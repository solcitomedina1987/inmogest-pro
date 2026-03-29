"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
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
      className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 px-3"
      disabled={loading}
      onClick={handleLogout}
    >
      <LogOut className="size-4 shrink-0" />
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
