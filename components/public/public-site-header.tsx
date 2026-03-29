import { BrandLogo } from "@/components/brand/brand-logo";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-white/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-[5rem] max-w-6xl items-center justify-center px-4 sm:h-[5.5rem]">
        <BrandLogo className="max-h-[3.75rem] max-w-[300px] sm:max-h-[4.5rem] sm:max-w-[330px]" priority />
      </div>
    </header>
  );
}
