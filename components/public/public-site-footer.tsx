import { Facebook, Instagram, MessageCircle, Phone } from "lucide-react";
import { getPublicSiteContact } from "@/lib/constants/public-site";
import { cn } from "@/lib/utils";

const linkBase =
  "flex size-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900";

export function PublicSiteFooter() {
  const c = getPublicSiteContact();

  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-stone-900">InmoGest Pro</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
            Encontrá tu próximo hogar o inversión. Contactanos por los canales habituales.
          </p>
        </div>
        <nav aria-label="Contacto y redes" className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={c.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkBase)}
            aria-label="WhatsApp"
          >
            <MessageCircle className="size-5" aria-hidden />
          </a>
          <a href={c.phoneHref} className={cn(linkBase)} aria-label="Teléfono">
            <Phone className="size-5" aria-hidden />
          </a>
          <a
            href={c.facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkBase)}
            aria-label="Facebook"
          >
            <Facebook className="size-5" aria-hidden />
          </a>
          <a
            href={c.instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkBase)}
            aria-label="Instagram"
          >
            <Instagram className="size-5" aria-hidden />
          </a>
        </nav>
      </div>
      <div className="border-t border-stone-100 py-4 text-center">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} InmoGest Pro. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
