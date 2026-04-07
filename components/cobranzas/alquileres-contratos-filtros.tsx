"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  defaultQ: string;
  incluirEliminados: boolean;
};

export function AlquileresContratosFiltros({ defaultQ, incluirEliminados }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultQ);
  const [eliminados, setEliminados] = useState(incluirEliminados);

  useEffect(() => {
    setQ(defaultQ);
    setEliminados(incluirEliminados);
  }, [defaultQ, incluirEliminados]);

  function aplicar() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (eliminados) params.set("eliminados", "1");
    const s = params.toString();
    startTransition(() => {
      router.push(s ? `/dashboard/cobranzas?${s}` : "/dashboard/cobranzas");
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Buscar contratos</CardTitle>
        <CardDescription>
          Filtrá por dirección o nombre de la propiedad, inquilino o propietario (locador).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="alquileres-buscar" className="text-xs font-medium text-muted-foreground">
            Texto
          </label>
          <Input
            id="alquileres-buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
            placeholder="Dirección, propiedad, inquilino o propietario…"
            autoComplete="off"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm sm:pb-2">
          <input
            type="checkbox"
            checked={eliminados}
            onChange={(e) => setEliminados(e.target.checked)}
            className="border-input size-4 rounded border"
          />
          Incluir contratos eliminados
        </label>
        <Button type="button" className="gap-2 sm:shrink-0" disabled={pending} onClick={aplicar}>
          <Search className="size-4 shrink-0" aria-hidden />
          {pending ? "Buscando…" : "Aplicar"}
        </Button>
      </CardContent>
    </Card>
  );
}
