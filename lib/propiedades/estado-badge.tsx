import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Colores alineados con la web pública y semántica de negocio.
 */
export function PropiedadEstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "Venta":
      return (
        <Badge className="border-0 bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600">
          Venta
        </Badge>
      );
    case "Alquiler":
      return (
        <Badge className="border-0 bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600">
          Alquiler
        </Badge>
      );
    case "Alquilada":
      return (
        <Badge
          className={cn(
            "border-0 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm",
            "bg-orange-800 hover:bg-orange-800",
          )}
        >
          Alquilada
        </Badge>
      );
    case "Vendida":
      return (
        <Badge
          className={cn(
            "border-0 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm",
            "bg-slate-500 hover:bg-slate-500",
          )}
        >
          Vendida
        </Badge>
      );
    case "Consultar":
      return (
        <Badge
          className={cn(
            "border-0 px-2.5 py-0.5 text-xs font-semibold shadow-sm",
            "bg-amber-400 text-amber-950 hover:bg-amber-400",
          )}
        >
          Consultar
        </Badge>
      );
    case "No Disponible":
      return (
        <Badge className="border-0 bg-red-700 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700">
          No Disponible
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold">
          {estado}
        </Badge>
      );
  }
}
