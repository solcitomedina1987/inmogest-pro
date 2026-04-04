import Link from "next/link";
import { Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";
import { formatMesHumano, mesSiguiente, mesActualYYYYMM } from "@/lib/cobranzas/alertas-actualizacion";

type Props = {
  contratos: ContratoCobranzaRow[];
};

/**
 * Banner reutilizable que muestra los contratos cuyo precio debe actualizarse
 * el mes siguiente al actual.
 * Se renderiza solo si hay contratos afectados.
 */
export function BannerActualizaciones({ contratos }: Props) {
  if (contratos.length === 0) return null;

  const mesProximo = mesSiguiente(mesActualYYYYMM());
  const mesHumano = formatMesHumano(mesProximo);

  return (
    <Alert className="border-amber-300 bg-amber-50 print:hidden">
      <Bell className="size-4 text-amber-600" aria-hidden />
      <AlertTitle className="font-semibold text-amber-800">
        {contratos.length === 1
          ? "1 contrato requiere actualización de precio este mes"
          : `${contratos.length} contratos requieren actualización de precio este mes`}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-1.5 text-amber-700">
        <p className="text-sm">
          En <strong>{mesHumano}</strong> corresponde actualizar el valor de alquiler para:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          {contratos.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/cobranzas/${c.id}`}
                className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
              >
                {c.propiedad?.nombre ?? "Propiedad sin nombre"}
                {(c.propiedad as { nombre: string; direccion?: string } | null)?.direccion
                  ? ` — ${(c.propiedad as { nombre: string; direccion?: string }).direccion}`
                  : ""}
              </Link>
              <span className="text-amber-600 ml-1.5 text-xs">
                · índice {c.indice_actualizacion}
                · cada {c.meses_actualizacion} meses
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          Recordá actualizar el monto en el contrato y notificar al inquilino con el nuevo valor.
        </p>
      </AlertDescription>
    </Alert>
  );
}
