import { ESTADO_PROPIEDAD_VALUES } from "@/lib/constants/propiedades";

/** Estados del enum `estado_propiedad_listado` disponibles en el filtro del home público. */
export const PUBLIC_HOME_ESTADOS_ORDENADOS = [...ESTADO_PROPIEDAD_VALUES] as const;

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
