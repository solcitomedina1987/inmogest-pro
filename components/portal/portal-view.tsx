"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ContratoDetallesCard } from "@/components/portal/contrato-detalles-card";
import { ContratoPagosHistorial } from "@/components/portal/contrato-pagos-historial";
import { ContratoWidgets, type ContratoWidgetData } from "@/components/portal/contrato-widgets";

type Props = {
  contrato: ContratoCobranzaRow;
  pagos: PagoRow[];
  widgets: ContratoWidgetData;
};

export function PortalView({ contrato, pagos, widgets }: Props) {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8 max-w-4xl mx-auto">

      {/* Encabezado */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mi contrato de alquiler</h1>
        <p className="text-muted-foreground text-sm">
          {contrato.propiedad?.nombre ?? "—"}
          {contrato.is_active
            ? <Badge variant="outline" className="ml-2 border-emerald-600 text-emerald-700">Activo</Badge>
            : <Badge variant="secondary" className="ml-2">Finalizado</Badge>}
        </p>
      </div>

      {/* ── Widgets informativos ── */}
      <ContratoWidgets data={widgets} />

      <ContratoDetallesCard contrato={contrato} />

      <ContratoPagosHistorial contrato={contrato} pagos={pagos} />

      {/* Simulador externo (Arquiler) */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Simulador de Aumento (Estimación)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CardDescription className="text-sm leading-relaxed">
            Utilice esta calculadora externa para proyectar sus próximos aumentos según los índices
            oficiales del BCRA e INDEC. Recuerde que los valores son estimaciones hasta la publicación
            definitiva de los índices.
          </CardDescription>
          <div className="mx-auto w-full max-w-[800px]">
            <iframe
              title="Calculadora de alquileres"
              src="https://arquiler.com/mini?theme=light&backgroundColor=ffffff"
              width="100%"
              height={600}
              className="w-full rounded-lg border-0 shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1)]"
              style={{ border: "none", borderRadius: 8 }}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
