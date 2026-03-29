"use server";

import { fetchPublicPropiedadesForHome } from "@/lib/data/public-propiedades";

/** Datos iniciales del home público (propiedades en cartel). */
export async function getPublicPropiedadesForHomeAction() {
  return fetchPublicPropiedadesForHome();
}
