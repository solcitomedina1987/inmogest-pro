/**
 * Estados considerados “en cartel” para el sitio público.
 * En el enum actual no existe `Disponible`; se usan operaciones activas + consulta.
 */
export const PROPIEDAD_ESTADOS_PUBLICOS = ["Alquiler", "Venta", "Consultar"] as const;

export type PublicSiteContact = {
  whatsappHref: string;
  phoneHref: string;
  facebookHref: string;
  instagramHref: string;
};

export function getPublicSiteContact(): PublicSiteContact {
  return {
    whatsappHref: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL?.trim() || "https://wa.me/",
    phoneHref: process.env.NEXT_PUBLIC_CONTACT_PHONE_TEL?.trim() || "tel:",
    facebookHref: process.env.NEXT_PUBLIC_CONTACT_FACEBOOK_URL?.trim() || "#",
    instagramHref: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM_URL?.trim() || "#",
  };
}
