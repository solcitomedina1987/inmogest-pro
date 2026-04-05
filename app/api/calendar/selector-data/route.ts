import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [{ data: clientes }, { data: propiedades }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre, apellido, telefono, tipo")
      .order("apellido", { ascending: true }),
    supabase
      .from("propiedades")
      .select("id, direccion, estado")
      .in("estado", ["Disponible", "Alquilada"])
      .order("direccion", { ascending: true }),
  ]);

  return NextResponse.json({
    clientes: clientes ?? [],
    propiedades: propiedades ?? [],
  });
}
