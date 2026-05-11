"use client";

import { Download } from "lucide-react";
import { resolveContratoDescargaUrl } from "@/lib/contratos/contrato-descarga";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const doc = contrato.contrato_legal;
  const descarga = doc ? resolveContratoDescargaUrl(doc) : null;

  return (
    <div className="flex max-w-4xl mx-auto flex-col gap-8 px-4 py-8 md:px-8">

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

      {descarga ? (
        <div className="flex justify-center px-1">
          <Button size="lg" className="w-full max-w-md gap-2 shadow-sm sm:w-auto" asChild>
            <a
              href={descarga.href}
              target="_blank"
              rel="noopener noreferrer"
              download={descarga.esPdf ? "contrato.pdf" : undefined}
            >
              <Download className="size-5 shrink-0" aria-hidden />
              {descarga.esPdf ? "Descargar contrato (PDF)" : descarga.etiqueta}
            </a>
          </Button>
        </div>
      ) : null}

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
