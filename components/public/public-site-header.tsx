import { BrandLogo } from "@/components/brand/brand-logo";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-white/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-center px-4 sm:h-[4.5rem]">
        <BrandLogo className="max-h-10 max-w-[200px] sm:max-h-12 sm:max-w-[220px]" priority />
      </div>
    </header>
  );
}
