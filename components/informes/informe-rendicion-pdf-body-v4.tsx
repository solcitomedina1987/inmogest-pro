import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { rendicionPdfIconDataUri } from "@/lib/cobranzas/concepto-rendicion-pdf-icon";
import { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";
import {
  debeMostrarLineaComision,
  etiquetaComisionInmobiliaria,
  impactoLineaEffective,
  partesLineasUnidadV4,
} from "@/lib/informes/rendicion-v4-display";
import type { ReactNode } from "react";
import type { ConceptoRendicionKey, InformeRendicionPayloadV4 } from "@/lib/informes/rendicion-types";

const precio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const s = StyleSheet.create({
  blockOuter: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#444",
    borderRadius: 2,
  },
  blockHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  blockTitle: { fontSize: 10.5, fontWeight: "bold" },
  unidadWrap: { paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  unidadTitle: { fontSize: 8.5, fontWeight: "bold", marginBottom: 4 },
  unidadRecibo: { fontSize: 7.5, color: "#666", marginBottom: 6 },
  bloqueInner: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#fafaf9",
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  lineRowFirst: { borderTopWidth: 0, paddingTop: 2 },
  iconCell: { width: 14, marginRight: 4, alignItems: "center", paddingTop: 1 },
  iconImg: { width: 11, height: 11 },
  cellConcept: { flex: 2.2, fontSize: 8.5 },
  cellObs: { fontSize: 7, color: "#555", marginTop: 2 },
  cellMonto: { flex: 1, fontSize: 8.5, textAlign: "right", fontWeight: "500" },
  cellMontoNeg: { color: "#b91c1c" },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#999",
  },
  subtotalLabel: { fontSize: 9, fontWeight: "bold" },
  subtotalNum: { fontSize: 9, fontWeight: "bold", textAlign: "right" },
  inmobBlock: { marginTop: 10, borderWidth: 1.5, borderColor: "#666", borderStyle: "dashed", borderRadius: 2 },
  inmobHead: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#f1f5f9", borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 3, paddingHorizontal: 4 },
  cell1: { flex: 2, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObsWide: { flex: 1.5, fontSize: 7.5, color: "#444" },
  resumenBox: {
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  resLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  resBold: { fontSize: 9, fontWeight: "bold" },
  resBoldNum: { fontSize: 9, fontWeight: "bold", textAlign: "right" },
  inmobTotalSep: {
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#999",
  },
  closureBox: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#fafaf9",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 3,
  },
  closureTitle: { fontSize: 8, fontWeight: "bold", textAlign: "center", color: "#444", marginBottom: 8 },
  closureUnitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  closureUnitTitulo: { fontSize: 8.5, fontWeight: "500", maxWidth: "72%", color: "#292524" },
  closureUnitNum: { fontSize: 8.5, fontWeight: "600", textAlign: "right" },
  closureDestacado: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#fff7ed",
    borderWidth: 2,
    borderColor: "#c2410c",
    borderRadius: 3,
  },
  closureDestacadoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closureDestacadoLabel: { fontSize: 12, fontWeight: "bold", maxWidth: "62%" },
  closureDestacadoNum: { fontSize: 16, fontWeight: "bold", textAlign: "right" },
  muted: { color: "#555", fontSize: 7.5 },
  rowPad: { paddingHorizontal: 8, paddingVertical: 8 },
  sectionRule: { marginTop: 10, marginBottom: 2, borderTopWidth: 2, borderTopColor: "#222" },
  warn: { fontSize: 7.5, color: "#b91c1c", marginTop: 4, marginBottom: 4 },
});

type Props = { payload: InformeRendicionPayloadV4 };

function PdfLineaConcepto({
  conceptoKey,
  titulo,
  montoTexto,
  esNegativo,
  obs,
  isFirst,
}: {
  conceptoKey: ConceptoRendicionKey;
  titulo: string;
  montoTexto: string;
  esNegativo: boolean;
  obs?: string | null;
  isFirst: boolean;
}) {
  return (
    <View style={[s.lineRow, isFirst ? s.lineRowFirst : {}]} wrap={false}>
      <View style={s.iconCell}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
        <Image src={rendicionPdfIconDataUri(conceptoKey)} style={s.iconImg} />
      </View>
      <View style={s.cellConcept}>
        <Text>{titulo}</Text>
        {obs?.trim() ? <Text style={s.cellObs}>{obs.trim()}</Text> : null}
      </View>
      <Text style={[s.cellMonto, esNegativo ? s.cellMontoNeg : {}]}>{montoTexto}</Text>
    </View>
  );
}

export function InformeRendicionPdfBodyV4({ payload }: Props) {
  const validacionOk =
    Math.abs(payload.total_validacion_neto - payload.total_a_rendir_propietario) < 0.02;

  return (
    <>
      <View style={s.blockOuter}>
        <View style={s.blockHeader}>
          <Text style={s.blockTitle}>Rendición de Alquileres</Text>
        </View>
        {payload.unidades.length === 0 ? (
          <View style={s.rowPad}>
            <Text style={s.muted}>Sin cobranzas en el período.</Text>
          </View>
        ) : (
          payload.unidades.map((u) => {
            const { lineaAlquiler, resto } = partesLineasUnidadV4(u);
            const showComision = debeMostrarLineaComision(payload, u);
            const alqFmt = precio(u.monto_alquiler);

            const lineRows: ReactNode[] = [];
            let rowSeq = 0;
            const isFirstRow = () => rowSeq++ === 0;

            if (lineaAlquiler) {
              const row = lineaAlquiler;
              const imp = impactoLineaEffective(row);
              const esResta = imp === "propietario_resta";
              const montoAbs = precio(row.monto);
              const montoTexto = esResta ? `-${montoAbs}` : montoAbs;
              lineRows.push(
                <PdfLineaConcepto
                  key={`${u.pago_id}-alq`}
                  conceptoKey={conceptoRendicionKeyDesdeLinea(row)}
                  titulo={row.concepto}
                  montoTexto={montoTexto}
                  esNegativo={esResta}
                  obs={row.observaciones}
                  isFirst={isFirstRow()}
                />,
              );
            }

            if (showComision) {
              lineRows.push(
                <PdfLineaConcepto
                  key={`${u.pago_id}-com`}
                  conceptoKey="honorarios_inmobiliarios"
                  titulo={etiquetaComisionInmobiliaria(payload.comision_porcentaje, alqFmt)}
                  montoTexto={`-${precio(u.comision_inmobiliaria_unidad)}`}
                  esNegativo
                  isFirst={isFirstRow()}
                />,
              );
            }

            resto.forEach((row, i) => {
              const imp = impactoLineaEffective(row);
              const esResta = imp === "propietario_resta";
              const montoAbs = precio(row.monto);
              const montoTexto = esResta ? `-${montoAbs}` : montoAbs;
              lineRows.push(
                <PdfLineaConcepto
                  key={`${u.pago_id}-ex-${i}`}
                  conceptoKey={conceptoRendicionKeyDesdeLinea(row)}
                  titulo={row.concepto}
                  montoTexto={montoTexto}
                  esNegativo={esResta}
                  obs={row.observaciones}
                  isFirst={isFirstRow()}
                />,
              );
            });

            return (
              <View key={u.pago_id} style={s.unidadWrap} wrap={false}>
                <Text style={s.unidadTitle}>{u.titulo_bloque}</Text>
                <Text style={s.unidadRecibo}>Recibo {u.pago_id.slice(0, 8)}…</Text>
                <View style={s.bloqueInner}>
                  {lineRows}
                  <View style={s.subtotalRow} wrap={false}>
                    <Text style={s.subtotalLabel}>Subtotal al propietario</Text>
                    <Text style={s.subtotalNum}>{precio(u.subtotal_neto_unidad)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={s.sectionRule} />

      <View style={s.inmobBlock}>
        <View style={s.inmobHead}>
          <Text style={s.blockTitle}>Rendición a Inmobiliaria</Text>
        </View>
        {payload.inmobiliaria_por_unidad.length === 0 ? (
          <View style={s.rowPad}>
            <Text style={s.muted}>Sin conceptos.</Text>
          </View>
        ) : (
          payload.inmobiliaria_por_unidad.map((bloque) => (
            <View key={bloque.pago_id} style={s.unidadWrap} wrap={false}>
              <Text style={s.unidadTitle}>{bloque.titulo_bloque}</Text>
              {bloque.items.map((o, i) => (
                <View key={`${bloque.pago_id}-im-${i}`} style={s.row} wrap={false}>
                  <View style={s.iconCell}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
                    <Image
                      src={rendicionPdfIconDataUri(
                        conceptoRendicionKeyDesdeLinea({
                          concepto: o.concepto,
                          concepto_key: o.concepto_key ?? null,
                        }),
                      )}
                      style={s.iconImg}
                    />
                  </View>
                  <Text style={s.cell1}>{o.concepto}</Text>
                  <Text style={s.cellN}>{precio(o.monto)}</Text>
                  <Text style={s.cellObsWide}>{o.observaciones ?? "—"}</Text>
                </View>
              ))}
              <View style={s.resumenBox}>
                <View style={[s.resLine, { marginBottom: 0 }]}>
                  <Text style={s.resBold}>Subtotal inmobiliaria (unidad)</Text>
                  <Text style={s.resBoldNum}>{precio(bloque.subtotal_unidad)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={s.inmobTotalSep}>
          <View style={s.closureDestacado}>
            <View style={s.closureDestacadoRow}>
              <Text style={s.closureDestacadoLabel}>Total general inmobiliaria</Text>
              <Text style={s.closureDestacadoNum}>{precio(payload.total_suma_inmobiliaria_conceptos)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.closureBox}>
        <Text style={s.closureTitle}>LIQUIDACIÓN FINAL</Text>
        {payload.unidades.map((u) => (
          <View key={`cl-${u.pago_id}`} style={s.closureUnitRow} wrap={false}>
            <Text style={s.closureUnitTitulo}>{u.titulo_bloque}</Text>
            <Text style={s.closureUnitNum}>{precio(u.subtotal_neto_unidad)}</Text>
          </View>
        ))}
        {!validacionOk ? (
          <Text style={s.warn}>
            Atención: diferencia de redondeo entre el total liquidado y el detalle por unidad.
          </Text>
        ) : null}
        <View style={s.closureDestacado}>
          <View style={s.closureDestacadoRow}>
            <Text style={s.closureDestacadoLabel}>Total al propietario</Text>
            <Text style={s.closureDestacadoNum}>{precio(payload.total_a_rendir_propietario)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}
