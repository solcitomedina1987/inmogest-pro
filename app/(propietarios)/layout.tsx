import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/constants/branding";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: `Propietarios | ${BRAND_NAME}`,
    template: `%s | ${BRAND_NAME}`,
  },
};

export default function PropietariosRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
