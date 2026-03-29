import type { ReactNode } from "react";
import {
  Banknote,
  Bath,
  BedDouble,
  Building2,
  KeyRound,
  Layers,
  MapPin,
  Maximize2,
} from "lucide-react";
import { PropiedadImagenCarousel } from "@/components/propiedades/propiedad-imagen-carousel";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const m2Fmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export type PropiedadPreviewModel = {
  nombre: string;
  tipo: string;
  estado: string;
  valor: number;
  dormitorios: number;
  banos: number;
  m2_totales: number;
  m2_cubiertos: number;
  direccion?: string;
  ubicacion_texto?: string | null;
  /** Galería ordenada; una sola URL = imagen estática. */
  imageUrls: string[];
  descripcion?: string | null;
};

type Props = {
  data: PropiedadPreviewModel;
  className?: string;
  /** Contenido sobre la foto (ej. botón cerrar en modal) */
  overlay?: ReactNode;
};

function Feature({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-stone-200/90 bg-stone-50/90 p-3 text-center shadow-sm sm:min-h-0 sm:flex-row sm:items-start sm:justify-start sm:gap-3 sm:p-3.5 sm:text-left",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-stone-500 shadow-sm ring-1 ring-stone-100">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <div className="min-w-0 w-full flex-1 sm:w-auto">
        <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">{label}</p>
        <p className="mt-0.5 break-words text-sm leading-snug font-semibold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

export function PropiedadPreviewContent({ data, className, overlay }: Props) {
  const {
    nombre,
    tipo,
    estado,
    valor,
    dormitorios,
    banos,
    m2_totales,
    m2_cubiertos,
    direccion,
    ubicacion_texto,
    imageUrls,
    descripcion,
  } = data;

  const ubicacion = [direccion?.trim(), ubicacion_texto?.trim()].filter(Boolean).join(" · ");

  return (
    <div className={cn("max-w-full bg-white text-stone-900", className)}>
      <PropiedadImagenCarousel
        alt={nombre}
        urls={imageUrls}
        sizes="(max-width: 768px) 100vw, min(48rem, 100vw)"
        className="w-full max-w-full sm:aspect-[2/1] sm:min-h-[220px] md:min-h-[260px]"
        topRight={overlay ?? undefined}
        showGradient
      />

      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
        <header className="space-y-2">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {nombre}
          </h2>
          {ubicacion ? (
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-stone-400" aria-hidden />
              <span>{ubicacion}</span>
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Feature icon={Building2} label="Tipo de propiedad" value={tipo} />
          <Feature icon={KeyRound} label="Tipo de operación" value={estado} />
          <Feature icon={Banknote} label="Valor" value={precioFmt.format(valor)} />
          <Feature icon={BedDouble} label="Dormitorios" value={String(dormitorios)} />
          <Feature icon={Bath} label="Baños" value={String(banos)} />
          <Feature icon={Maximize2} label="Metros cuadrados totales" value={`${m2Fmt.format(m2_totales)} m²`} />
          <Feature icon={Layers} label="Metros cuadrados cubiertos" value={`${m2Fmt.format(m2_cubiertos)} m²`} />
        </div>

        <section className="border-t border-stone-200 pt-6">
          <h3 className="text-sm font-semibold tracking-tight text-stone-900">Descripción</h3>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-stone-600">
            {descripcion?.trim() ? descripcion.trim() : "Sin descripción cargada para esta propiedad."}
          </p>
        </section>
      </div>
    </div>
  );
}
