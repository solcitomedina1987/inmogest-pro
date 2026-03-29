import type { Metadata } from "next";
import { getPublicPropiedadesForHomeAction } from "@/app/actions/public-propiedades";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/branding";
import { PublicHomeClient } from "@/components/public/public-home-client";
import { PublicSiteFooter } from "@/components/public/public-site-footer";
import { PublicSiteHeader } from "@/components/public/public-site-header";

export const metadata: Metadata = {
  title: { absolute: BRAND_NAME },
  description: BRAND_TAGLINE,
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
  },
};

export default async function HomePage() {
  const propiedades = await getPublicPropiedadesForHomeAction();

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-stone-50 text-stone-900">
      <PublicSiteHeader />
      <PublicHomeClient initialPropiedades={propiedades} />
      <PublicSiteFooter />
    </div>
  );
}
