import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { calculateArquiler, pickEstimatedValue, type CalculatorRate } from "@/lib/services/calculator";

type Body = {
  amount: number;
  date: string;
  months: number;
  rate: CalculatorRate;
  month: string;
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Sin autorización." }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{4}-\d{2}$/.test(body.month)) {
    return NextResponse.json({ ok: false, error: "Fecha o período inválido." }, { status: 400 });
  }

  try {
    const resp = await calculateArquiler({
      amount: Number(body.amount),
      date: body.date,
      months: Number(body.months),
      rate: body.rate,
    });
    const value = pickEstimatedValue(resp, body.month);
    return NextResponse.json({ ok: true, value });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo calcular estimado";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
