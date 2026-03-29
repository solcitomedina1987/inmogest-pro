/**
 * Imagen por defecto (archivo en `public/img/casa-default.png`).
 * Se usa en UI y se persiste en `propiedades_img` cuando no se suben fotos.
 */
export const PROPIEDAD_IMAGEN_DEFAULT = "/img/casa-default.png";

/** Alias histórico — mismo valor que la imagen local por defecto. */
export const PROPIEDAD_IMAGEN_PLACEHOLDER = PROPIEDAD_IMAGEN_DEFAULT;

export const TIPO_PROPIEDAD_VALUES = [
  "Casa",
  "Departamento",
  "Lote",
  "Local",
  "Otro",
] as const;

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
