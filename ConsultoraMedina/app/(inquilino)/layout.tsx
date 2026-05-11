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
      <main>{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
