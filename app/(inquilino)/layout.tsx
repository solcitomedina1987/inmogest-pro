import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/constants/branding";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: `Mi Portal | ${BRAND_NAME}`,
    template: `%s | ${BRAND_NAME}`,
  },
};

export default function InquilinoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior mínima */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-8">
          <span className="text-sm font-semibold text-primary">{BRAND_NAME}</span>
          <span className="text-xs text-muted-foreground">Portal de Inquilinos</span>
        </div>
      </header>
      <main>{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
