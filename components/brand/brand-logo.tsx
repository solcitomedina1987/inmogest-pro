import Image from "next/image";
import { BRAND_LOGO_SRC } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Usar en login u otras vistas above-the-fold */
  priority?: boolean;
};

/**
 * Logo desde `public/img/logo.PNG`.
 * `width`/`height` del Image deben ser mayores que el máximo en pantalla; si no, el `<img>`
 * suele quedar ~200px aunque el CSS tenga `max-w` más grande.
 */
const INTRINSIC_W = 960;
const INTRINSIC_H = Math.round((56 * INTRINSIC_W) / 200);

export function BrandLogo({ className, priority }: Props) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="InmoGest Pro"
      width={INTRINSIC_W}
      height={INTRINSIC_H}
      sizes="(max-width: 640px) 90vw, 480px"
      className={cn(
        "h-auto w-auto object-contain object-center",
        "max-h-[4.125rem] max-w-[300px]",
        className,
      )}
      priority={priority}
    />
  );
}
