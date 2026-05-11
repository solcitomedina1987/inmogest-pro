/**
 * Imagen por defecto (archivo en `public/img/casa-default.png`).
 * Se usa en UI y se persiste en `propiedades_img` cuando no se suben fotos.
 */
export const PROPIEDAD_IMAGEN_DEFAULT = "/img/casa-default.png";

/** Alias histórico — mismo valor que la imagen local por defecto. */
export const PROPIEDAD_IMAGEN_PLACEHOLDER = PROPIEDAD_IMAGEN_DEFAULT;

/** Valores alineados al seed de `tipos_propiedad` (filtros y sitio público). */
export const TIPO_PROPIEDAD_VALUES = [
  "Casa",
  "Departamento",
  "Lote",
  "Local",
  "Terreno",
  "Duplex",
  "Galpón",
  "Fabrica",
  "Otro",
] as const;

/** Disponible en cartel / sin contrato activo que la ocupe (equivalente operativo a “activa” para nuevos alquileres). */
export const ESTADO_PROPIEDAD_CARTEL_ALQUILER = "Alquiler";

export const ESTADO_PROPIEDAD_VALUES = [
  "Alquiler",
  "Alquilada",
  "Venta",
  "Vendida",
  "Consultar",
  "No Disponible",
] as const;

export const MAX_IMAGENES_PROPIEDAD = 10;

/** Tamaño máximo por archivo al subir fotos (validación cliente y servidor). */
export const MAX_BYTES_PROPIEDAD_IMAGEN = 5 * 1024 * 1024;

/** Destacadas en sitio público (carrusel + panel admin). */
export const MAX_PROPIEDADES_DESTACADAS = 3;

export const MSG_MAX_PROPIEDADES_DESTACADAS = "Solo puedes destacar hasta 3 propiedades";
