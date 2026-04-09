import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { mesPeriodoDesdeFecha, proximaFechaActualizacionAlquiler } from "@/lib/cobranzas/estado-contrato";
import type { ContratoWidgetData } from "@/components/portal/contrato-widgets";

function diffDays(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Misma lógica que en `app/(inquilino)/portal/page.tsx` para los tres widgets. */
export function buildContratoWidgetData(
  contrato: ContratoCobranzaRow,
  pagos: PagoRow[],
  calculatorConfigured: boolean,
  now = new Date(),
): ContratoWidgetData {
  const mesesPagados = pagos.filter((p) => p.estado === "Pagado").length;
  const totalMeses = pagos.length;
  const progresoPct = totalMeses > 0 ? Math.round((mesesPagados / totalMeses) * 100) : 0;

  let diasActualizacion: number | null = null;
  let estimacionMes: string | null = null;
  if (contrato.meses_actualizacion > 0) {
    const proxima = proximaFechaActualizacionAlquiler(
      contrato.fecha_inicio,
      contrato.fecha_vencimiento,
      contrato.meses_actualizacion,
      contrato.ultima_actualizacion,
      now,
    );
    if (proxima) {
      diasActualizacion = diffDays(now, proxima);
      if (calculatorConfigured) {
        const proximaISO = `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, "0")}-${String(proxima.getDate()).padStart(2, "0")}`;
        estimacionMes = mesPeriodoDesdeFecha(proximaISO);
      }
    }
  }

  const fechaVenc = parseLocalDate(contrato.fecha_vencimiento);
  const diasVencimiento = diffDays(now, fechaVenc);

  return {
    mesesPagados,
    totalMeses,
    progresoPct,
    diasActualizacion,
    montoActual: contrato.monto_mensual,
    indice: contrato.indice_actualizacion ?? "ICL",
    fechaVencimiento: contrato.fecha_vencimiento,
    diasVencimiento,
    contratoId: contrato.id,
    estimacionMes,
    calculatorConfigured,
  };
}
