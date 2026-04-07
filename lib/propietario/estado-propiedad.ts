/** Etiquetas unificadas para el portal de propietarios. */
export function etiquetaEstadoPropiedad(estado: string): "Alquilada" | "En alquiler" | "Disponible" {
  if (estado === "Alquilada") return "Alquilada";
  if (estado === "Alquiler") return "En alquiler";
  return "Disponible";
}
