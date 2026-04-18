import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { buildInformeRendicionPdfBuffer } from "@/lib/informes/build-informe-pdf-buffer";
import type { InformeRendicionPayloadV1 } from "@/lib/informes/rendicion-types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sin autorización." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { data: row, error } = await auth.supabase
    .from("informes_rendicion")
    .select("payload, mes_periodo, fecha_generacion")
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.payload) {
    return NextResponse.json({ error: "Informe no encontrado." }, { status: 404 });
  }

  const payload = row.payload as InformeRendicionPayloadV1;
  if (payload.v !== 1) {
    return NextResponse.json({ error: "Formato no soportado." }, { status: 400 });
  }

  try {
    const buf = await buildInformeRendicionPdfBuffer(payload, {
      fechaGeneracion: row.fecha_generacion as string | null,
    });
    const mes = (row.mes_periodo as string) ?? "informe";
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rendicion-${mes}-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
