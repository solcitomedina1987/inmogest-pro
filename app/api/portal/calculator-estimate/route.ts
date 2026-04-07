import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { calculateArquiler, pickEstimatedValue, type CalculatorRate } from "@/lib/services/calculator";

type Body = {
  contratoId: string;
  month: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Sin sesión." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });
  }

  if (!body.contratoId || !/^\d{4}-\d{2}$/.test(body.month)) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: cliente, error: cliErr } = await db
    .from("clientes")
    .select("id")
    .ilike("email", user.email)
    .maybeSingle();

  if (cliErr || !cliente) {
    return NextResponse.json({ ok: false, error: "Cliente no encontrado." }, { status: 403 });
  }

  const { data: contrato, error: cErr } = await db
    .from("contratos_cobranza")
    .select(
      "id, cliente_id, fecha_inicio, monto_mensual, meses_actualizacion, indice_actualizacion, is_active, deleted_at",
    )
    .eq("id", body.contratoId)
    .maybeSingle();

  if (
    cErr ||
    !contrato ||
    contrato.cliente_id !== cliente.id ||
    !contrato.is_active ||
    contrato.deleted_at
  ) {
    return NextResponse.json({ ok: false, error: "Contrato no disponible." }, { status: 403 });
  }

  const date = contrato.fecha_inicio as string;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "Fecha de contrato inválida." }, { status: 400 });
  }

  try {
    const rate: CalculatorRate = contrato.indice_actualizacion === "IPC" ? "ipc" : "icl";
    const resp = await calculateArquiler({
      amount: Number(contrato.monto_mensual),
      date,
      months: Number(contrato.meses_actualizacion),
      rate,
    });
    const value = pickEstimatedValue(resp, body.month);
    return NextResponse.json({ ok: true, value });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo calcular estimado";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
