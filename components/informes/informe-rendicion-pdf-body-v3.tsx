import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { rendicionPdfIconDataUri } from "@/lib/cobranzas/concepto-rendicion-pdf-icon";
import { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";
import type { InformeRendicionPayloadV3 } from "@/lib/informes/rendicion-types";

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
  unidadWrap: { paddingHorizontal: 6, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  unidadTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 3, paddingHorizontal: 4 },
  iconCell: { width: 14, marginRight: 4, alignItems: "center", justifyContent: "center" },
  iconImg: { width: 11, height: 11 },
  cell1: { flex: 2, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObs: { flex: 1.5, fontSize: 7.5, color: "#444" },
  subUnidad: {
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  subUnidadLine: { flexDirection: "row", justifyContent: "space-between" },
  subUnidadBold: { fontSize: 9, fontWeight: "bold" },
  netoNote: { fontSize: 7.5, color: "#555", marginTop: 3 },
  inmobBlock: { marginTop: 12, borderWidth: 1.5, borderColor: "#666", borderStyle: "dashed", borderRadius: 2 },
  inmobHead: { padding: 6, backgroundColor: "#f1f5f9", borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  tableFootLight: {
    borderTopWidth: 1,
    borderTopColor: "#999",
    backgroundColor: "#e8ecf0",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  closureBox: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#fafaf9",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 3,
  },
  closureTitle: { fontSize: 8, fontWeight: "bold", textAlign: "center", color: "#444", marginBottom: 8 },
  closureLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  closureBold: { fontSize: 9, fontWeight: "bold" },
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
  closureDestacadoLabel: { fontSize: 12, fontWeight: "bold", maxWidth: "58%" },
  closureDestacadoNum: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#555", fontSize: 8 },
  sectionRule: { marginTop: 12, marginBottom: 4, borderTopWidth: 2, borderTopColor: "#222" },
  rowPad: { paddingHorizontal: 8, paddingVertical: 8 },
});

type Props = { payload: InformeRendicionPayloadV3 };

export function InformeRendicionPdfBodyV3({ payload }: Props) {
  return (
    <>
      <View style={s.blockOuter}>
        <View style={s.blockHeader}>
          <Text style={s.blockTitle}>Rendición de Alquileres</Text>
          <Text style={s.blockSub}>Por propiedad / contrato — cobrado al inquilino y neto por recibo.</Text>
        </View>
        {payload.unidades.length === 0 ? (
          <View style={s.rowPad}>
            <Text style={s.muted}>Sin cobranzas en el período.</Text>
          </View>
        ) : (
          payload.unidades.map((u) => (
            <View key={u.pago_id} style={s.unidadWrap} wrap={false}>
              <Text style={s.unidadTitle}>{u.etiqueta}</Text>
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
              <View style={s.subUnidad}>
                <View style={s.subUnidadLine}>
                  <Text style={s.subUnidadBold}>Subtotal cobrado al inquilino (unidad)</Text>
                  <Text style={s.subUnidadBold}>{precio(u.subtotal_cobrado_inquilino)}</Text>
                </View>
                <Text style={s.netoNote}>
                  Neto propietario este recibo: {precio(u.neto_propietario_recibo)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={s.sectionRule} />

      <View style={s.inmobBlock}>
        <View style={s.inmobHead}>
          <Text style={s.blockTitle}>Suma a Inmobiliaria</Text>
          <Text style={s.blockSub}>Detalle informativo; suma interna de la tabla.</Text>
        </View>
        {payload.suma_inmobiliaria_items.length === 0 ? (
          <View style={s.rowPad}>
            <Text style={s.muted}>Sin conceptos.</Text>
          </View>
        ) : (
          <>
            <View style={s.row}>
              <View style={s.iconCell} />
              <Text style={[s.cell1, { fontWeight: "bold" }]}>Concepto</Text>
              <Text style={[s.cellN, { fontWeight: "bold" }]}>Monto</Text>
              <Text style={[s.cellObs, { fontWeight: "bold" }]}>Obs.</Text>
            </View>
            {payload.suma_inmobiliaria_items.map((o, i) => (
              <View key={`${o.pago_id}-im-${i}`} style={s.row} wrap={false}>
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
          </>
        )}
        <View style={s.tableFootLight}>
          <View style={s.subUnidadLine}>
            <Text style={s.subUnidadBold}>Suma conceptos (tabla)</Text>
            <Text style={s.subUnidadBold}>{precio(payload.total_suma_inmobiliaria_conceptos)}</Text>
          </View>
        </View>
      </View>

      <View style={s.closureBox}>
        <Text style={s.closureTitle}>LIQUIDACIÓN FINAL</Text>
        <View style={s.closureLine}>
          <View style={{ maxWidth: "65%" }}>
            <Text style={s.closureBold}>Subtotal a rendir al propietario</Text>
            <Text style={{ fontSize: 7.5, color: "#666", marginTop: 2 }}>(Suma de alquileres y extras del dueño)</Text>
          </View>
          <Text style={s.closureBold}>{precio(payload.subtotal_a_rendir_propietario)}</Text>
        </View>
        <View style={s.closureLine}>
          <Text>Comisión Inmobiliaria ({payload.comision_porcentaje}%)</Text>
          <Text style={{ fontWeight: "bold" }}>- {precio(payload.comision_monto)}</Text>
        </View>
        <View style={s.closureDestacado}>
          <View style={s.closureDestacadoRow}>
            <Text style={s.closureDestacadoLabel}>TOTAL A RENDIR AL PROPIETARIO</Text>
            <Text style={s.closureDestacadoNum}>{precio(payload.total_a_rendir_propietario)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}
