import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { rendicionPdfIconDataUri } from "@/lib/cobranzas/concepto-rendicion-pdf-icon";
import { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";
import type { InformeRendicionPayloadV4 } from "@/lib/informes/rendicion-types";

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
  blockSub: { fontSize: 7.5, color: "#555", marginTop: 2 },
  unidadWrap: { paddingHorizontal: 6, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  unidadTitle: { fontSize: 8.5, fontWeight: "bold", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 3, paddingHorizontal: 4 },
  iconCell: { width: 14, marginRight: 4, alignItems: "center", justifyContent: "center" },
  iconImg: { width: 11, height: 11 },
  cell1: { flex: 2, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObs: { flex: 1.5, fontSize: 7.5, color: "#444" },
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
  resLabel: { fontSize: 8, color: "#333", maxWidth: "72%" },
  resNum: { fontSize: 8, textAlign: "right" },
  resBold: { fontSize: 9, fontWeight: "bold" },
  resBoldNum: { fontSize: 9, fontWeight: "bold", textAlign: "right" },
  inmobBlock: { marginTop: 10, borderWidth: 1.5, borderColor: "#666", borderStyle: "dashed", borderRadius: 2 },
  inmobHead: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#f1f5f9", borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  tableFootLight: {
    borderTopWidth: 1,
    borderTopColor: "#999",
    backgroundColor: "#e8ecf0",
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  closureLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  closureBold: { fontSize: 9, fontWeight: "bold" },
  closureNum: { fontSize: 9, fontWeight: "bold", textAlign: "right" },
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
});

type Props = { payload: InformeRendicionPayloadV4 };

export function InformeRendicionPdfBodyV4({ payload }: Props) {
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
          payload.unidades.map((u) => (
            <View key={u.pago_id} style={s.unidadWrap} wrap={false}>
              <Text style={s.unidadTitle}>{u.titulo_bloque}</Text>
              {u.lineas.map((row, i) => (
                <View key={`${u.pago_id}-l-${i}`} style={s.row} wrap={false}>
                  <View style={s.iconCell}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
                    <Image src={rendicionPdfIconDataUri(conceptoRendicionKeyDesdeLinea(row))} style={s.iconImg} />
                  </View>
                  <Text style={s.cell1}>{row.concepto}</Text>
                  <Text style={s.cellN}>{precio(row.monto)}</Text>
                  <Text style={s.cellObs}>{row.observaciones ?? "—"}</Text>
                </View>
              ))}
              <View style={s.resumenBox}>
                <View style={s.resLine}>
                  <Text style={s.resLabel}>Subtotal bruto (alquiler + suma al propietario)</Text>
                  <Text style={s.resNum}>{precio(u.subtotal_bruto)}</Text>
                </View>
                <View style={s.resLine}>
                  <Text style={s.resLabel}>
                    Comisión ({payload.comision_porcentaje}% sobre alquiler {precio(u.monto_alquiler)})
                  </Text>
                  <Text style={s.resNum}>- {precio(u.comision_inmobiliaria_unidad)}</Text>
                </View>
                <View style={s.resLine}>
                  <Text style={s.resLabel}>Deducciones (resta al propietario)</Text>
                  <Text style={s.resNum}>- {precio(u.deducciones)}</Text>
                </View>
                <View style={[s.resLine, { marginBottom: 0 }]}>
                  <Text style={s.muted}>Total cobrado al inquilino</Text>
                  <Text style={s.muted}>{precio(u.subtotal_cobrado_inquilino)}</Text>
                </View>
                <View style={[s.resLine, { marginTop: 5, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: "#999" }]}>
                  <Text style={s.resBold}>Subtotal neto unidad</Text>
                  <Text style={s.resBoldNum}>{precio(u.subtotal_neto_unidad)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={s.sectionRule} />

      <View style={s.inmobBlock}>
        <View style={s.inmobHead}>
          <Text style={s.blockTitle}>Rendición a Inmobiliaria</Text>
          <Text style={s.blockSub}>Por unidad / recibo.</Text>
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
                  <Text style={s.cellObs}>{o.observaciones ?? "—"}</Text>
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
        <View style={s.tableFootLight}>
          <View style={s.resLine}>
            <Text style={s.resBold}>Total general inmobiliaria</Text>
            <Text style={s.resBoldNum}>{precio(payload.total_suma_inmobiliaria_conceptos)}</Text>
          </View>
        </View>
      </View>

      <View style={s.closureBox}>
        <Text style={s.closureTitle}>LIQUIDACIÓN FINAL</Text>
        <View style={s.closureLine}>
          <Text style={s.closureBold}>Subtotal propiedades</Text>
          <Text style={s.closureNum}>{precio(payload.total_subtotal_bruto_periodo)}</Text>
        </View>
        <View style={s.closureLine}>
          <Text style={s.closureBold}>Comisiones (suma por unidad)</Text>
          <Text style={s.closureNum}>- {precio(payload.total_comisiones_periodo)}</Text>
        </View>
        <View style={[s.closureLine, { marginBottom: 8 }]}>
          <Text style={s.closureBold}>Deducciones (resta al propietario)</Text>
          <Text style={s.closureNum}>- {precio(payload.total_deducciones_periodo)}</Text>
        </View>
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
