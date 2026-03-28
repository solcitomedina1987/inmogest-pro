import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/propiedades", label: "Propiedades" },
  { href: "/dashboard/proveedores", label: "Proveedores" },
  { href: "/dashboard/cobranzas", label: "Cobranzas" },
  { href: "/dashboard/contratos", label: "Contratos" },
];

export function AppSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">InmoGest Pro</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
