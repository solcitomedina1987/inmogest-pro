import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { calculateArquiler, pickEstimatedValue } from "@/lib/services/calculator";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Sin autorización." }, { status: 401 });

  const { id } = await ctx.params;
  const { supabase } = auth;

  const { data: c, error } = await supabase
    .from("contratos_cobranza")
    .select("id, fecha_inicio, monto_mensual, meses_actualizacion, indice_actualizacion")
    .eq("id", id)
    .maybeSingle();

  if (error || !c) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });

  try {
    const resp = await calculateArquiler({
      amount: Number(c.monto_mensual),
      date: c.fecha_inicio as string,
      months: Number(c.meses_actualizacion),
      rate: (c.indice_actualizacion as string) === "IPC" ? "ipc" : "icl",
    });

    const byMonth: Record<string, number> = {};
    for (const row of resp.data) {
      const month = row.period ?? row.date?.slice(0, 7);
      if (!month) continue;
      byMonth[month] = row.value;
    }

    const month = new URL(req.url).searchParams.get("month");
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const value = pickEstimatedValue(resp, month);
      return NextResponse.json({ ok: true, byMonth, value, month });
    }

    return NextResponse.json({ ok: true, byMonth });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al calcular";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
