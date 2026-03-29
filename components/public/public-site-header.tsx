import { BrandLogo } from "@/components/brand/brand-logo";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-white/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-[6.25rem] max-w-full items-center justify-center px-4 md:px-8 sm:h-[7.25rem]">
        <BrandLogo
          className="max-h-[5.625rem] max-w-[450px] sm:max-h-[6.75rem] sm:max-w-[495px]"
          priority
        />
      </div>
    </header>
  );
}
