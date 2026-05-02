import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InformeRendicionPayload } from "@/lib/informes/rendicion-types";
import { InformeRendicionPdfBodyV3 } from "@/components/informes/informe-rendicion-pdf-body-v3";

const precio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  logoWrap: { alignItems: "center", marginBottom: 12 },
  logo: { width: 140, maxHeight: 48, objectFit: "contain" },
  logoSub: { fontSize: 8, textAlign: "center", color: "#444", marginTop: 6, marginBottom: 14 },
  brand: { fontSize: 11, textAlign: "center", fontWeight: "bold", marginBottom: 4 },
  subBrand: { fontSize: 8, textAlign: "center", color: "#444", marginBottom: 16 },
  h1: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  meta: { fontSize: 9, marginBottom: 10, lineHeight: 1.45 },
  blockOuter: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#444",
    borderRadius: 2,
  },
  blockHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#faf8f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  blockTitle: { fontSize: 10.5, fontWeight: "bold" },
  blockBadge: { fontSize: 7.5, color: "#555", marginTop: 2 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4, paddingHorizontal: 6 },
  cell1: { flex: 2.2, fontSize: 8.5 },
  cellMid: { flex: 1.1, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObs: { flex: 1.5, fontSize: 7.5, color: "#444" },
  tableFoot: {
    borderTopWidth: 2,
    borderTopColor: "#333",
    backgroundColor: "#f0eeeb",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  footBold: { fontWeight: "bold", fontSize: 9 },
  footBoldNum: { fontWeight: "bold", fontSize: 9, textAlign: "right" },
  sectionRule: {
    marginTop: 14,
    marginBottom: 14,
    borderTopWidth: 3,
    borderTopColor: "#222",
    paddingTop: 2,
  },
  closureBox: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#f7f6f4",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  closureTitle: { fontSize: 8, fontWeight: "bold", textAlign: "center", letterSpacing: 1.2, color: "#333", marginBottom: 8 },
  closureLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  closureRule: { marginTop: 6, marginBottom: 0 },
  closureTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#dcd9d4",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 2,
  },
  closureTotalText: { fontWeight: "bold", fontSize: 11.5 },
  muted: { color: "#555", fontSize: 8.5 },
  signArea: { marginTop: 28, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#bbb" },
  signLabel: { fontSize: 8, color: "#444", textAlign: "center", marginBottom: 28 },
  signLine: { borderBottomWidth: 0.75, borderBottomColor: "#333", marginHorizontal: 72, marginBottom: 6 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalBold: { fontWeight: "bold", fontSize: 10 },
});

export type InformeRendicionPdfProps = {
  payload: InformeRendicionPayload;
  fechaGeneracion?: string | null;
  logoDataUri?: string | null;
};

function formatFechaGeneracion(iso?: string | null): string {
  if (!iso) {
    return new Date().toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  }
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function CabeceraMarca({ logoDataUri }: { logoDataUri?: string | null }) {
  if (logoDataUri) {
    return (
      <View style={styles.logoWrap}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
        <Image src={logoDataUri} style={styles.logo} />
        <Text style={styles.logoSub}>Informe de rendición — documento generado electrónicamente</Text>
      </View>
    );
  }
  return (
    <>
      <Text style={styles.brand}>Consultora Medina &amp; Asociados</Text>
      <Text style={styles.subBrand}>Informe de rendición — documento generado electrónicamente</Text>
    </>
  );
}

function BloqueFirma() {
  return (
    <View style={styles.signArea}>
      <Text style={styles.signLabel}>Firma y aclaración del propietario / la propietaria</Text>
      <View style={styles.signLine} />
    </View>
  );
}

export function InformeRendicionPdfDocument({ payload, fechaGeneracion, logoDataUri }: InformeRendicionPdfProps) {
  const fecha = formatFechaGeneracion(fechaGeneracion);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <CabeceraMarca logoDataUri={logoDataUri} />

        <Text style={styles.h1}>Rendición de cobranzas</Text>
        <Text style={styles.meta}>
          Fecha de generación: {fecha}
          {"\n"}
          Propietario: {payload.propietario_nombre}
          {"\n"}
          Período rendido: {payload.mes_periodo} — Comisión sobre alquileres: {payload.comision_porcentaje}%
        </Text>

        {payload.v === 3 ? (
          <InformeRendicionPdfBodyV3 payload={payload} />
        ) : payload.v === 2 ? (
          <>
            <View style={styles.blockOuter}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockTitle}>Rendición de Alquileres</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.cell1, { fontWeight: "bold" }]}>Propiedad</Text>
                <Text style={[styles.cellMid, { fontWeight: "bold" }]}>Concepto</Text>
                <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
              </View>
              {payload.alquileres.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.muted}>Sin alquileres en el período.</Text>
                </View>
              ) : (
                payload.alquileres.map((a) => (
                  <View key={a.pago_id} style={styles.row} wrap={false}>
                    <Text style={styles.cell1}>{a.etiqueta}</Text>
                    <Text style={styles.cellMid}>Alquiler</Text>
                    <Text style={styles.cellN}>{precio(a.monto)}</Text>
                  </View>
                ))
              )}
              <View style={styles.tableFoot}>
                <View style={styles.footLine}>
                  <Text style={styles.footBold}>Subtotal Alquileres</Text>
                  <Text style={styles.footBoldNum}>{precio(payload.total_alquileres_cobrados)}</Text>
                </View>
                <View style={styles.footLine}>
                  <Text>Comisión Inmobiliaria ({payload.comision_porcentaje}%)</Text>
                  <Text style={{ textAlign: "right" }}>- {precio(payload.comision_monto)}</Text>
                </View>
                <View style={[styles.footLine, { marginBottom: 0, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: "#999" }]}>
                  <Text style={styles.footBold}>Subtotal Neto de Alquileres</Text>
                  <Text style={styles.footBoldNum}>{precio(payload.neto_alquileres)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionRule} />

            <View style={styles.blockOuter}>
              <View style={[styles.blockHeader, { backgroundColor: "#ecfdf5" }]}>
                <Text style={styles.blockTitle}>Conceptos a favor del propietario</Text>
                <Text style={styles.blockBadge}>Suman a la liquidación al dueño.</Text>
              </View>
              {payload.otros_conceptos.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.muted}>Sin conceptos a favor en el período.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.cell1, { fontWeight: "bold" }]}>Concepto</Text>
                    <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
                    <Text style={[styles.cellObs, { fontWeight: "bold" }]}>Obs.</Text>
                  </View>
                  {payload.otros_conceptos.map((o, i) => (
                    <View key={`${o.pago_id}-${i}`} style={styles.row} wrap={false}>
                      <Text style={styles.cell1}>{o.concepto}</Text>
                      <Text style={styles.cellN}>{precio(o.monto)}</Text>
                      <Text style={styles.cellObs}>{o.observaciones ?? "—"}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={[styles.blockOuter, { marginTop: 10 }]}>
              <View style={[styles.blockHeader, { backgroundColor: "#fef2f2" }]}>
                <Text style={styles.blockTitle}>Deducciones al propietario</Text>
                <Text style={styles.blockBadge}>Se restan del total a rendir.</Text>
              </View>
              {payload.deducciones_propietario.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.muted}>Sin deducciones en el período.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.cell1, { fontWeight: "bold" }]}>Concepto</Text>
                    <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
                    <Text style={[styles.cellObs, { fontWeight: "bold" }]}>Obs.</Text>
                  </View>
                  {payload.deducciones_propietario.map((o, i) => (
                    <View key={`${o.pago_id}-d-${i}`} style={styles.row} wrap={false}>
                      <Text style={styles.cell1}>{o.concepto}</Text>
                      <Text style={styles.cellN}>- {precio(o.monto)}</Text>
                      <Text style={styles.cellObs}>{o.observaciones ?? "—"}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={[styles.blockOuter, { marginTop: 10 }]}>
              <View style={[styles.blockHeader, { backgroundColor: "#f5f5f4" }]}>
                <Text style={styles.blockTitle}>Suma a inmobiliaria</Text>
                <Text style={styles.blockBadge}>Retención del neto al propietario.</Text>
              </View>
              {payload.informativos_conceptos.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.muted}>Sin retenciones inmobiliaria.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.cell1, { fontWeight: "bold" }]}>Concepto</Text>
                    <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
                    <Text style={[styles.cellObs, { fontWeight: "bold" }]}>Obs.</Text>
                  </View>
                  {payload.informativos_conceptos.map((o, i) => (
                    <View key={`${o.pago_id}-i-${i}`} style={styles.row} wrap={false}>
                      <Text style={styles.cell1}>{o.concepto}</Text>
                      <Text style={styles.cellN}>- {precio(o.monto)}</Text>
                      <Text style={styles.cellObs}>{o.observaciones ?? "—"}</Text>
                    </View>
                  ))}
                </>
              )}
              <View style={[styles.tableFoot, { backgroundColor: "#e8e6e3" }]}>
                <View style={[styles.footLine, { marginBottom: 0 }]}>
                  <Text style={styles.footBold}>Subtotal conceptos (favor − deducciones − inmobiliaria)</Text>
                  <Text style={styles.footBoldNum}>{precio(payload.subtotal_otros_conceptos)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.closureBox}>
              <Text style={styles.closureTitle}>LIQUIDACIÓN FINAL</Text>
              <View style={styles.closureLine}>
                <Text style={styles.footBold}>Subtotal Neto de Alquileres:</Text>
                <Text style={styles.footBoldNum}>{precio(payload.neto_alquileres)}</Text>
              </View>
              <View style={[styles.closureLine, { marginBottom: 0 }]}>
                <Text style={styles.footBold}>Subtotal conceptos (liquidación dueño, favor − deducc. − inmob.):</Text>
                <Text style={styles.footBoldNum}>{precio(payload.subtotal_otros_conceptos)}</Text>
              </View>
              <View style={styles.closureRule} />
              <View style={styles.closureTotal}>
                <Text style={styles.closureTotalText}>TOTAL NETO A RENDIR AL DUEÑO:</Text>
                <Text style={styles.closureTotalText}>{precio(payload.total_neto_a_rendir)}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 10.5, fontWeight: "bold", marginTop: 8, marginBottom: 4 }}>
              Alquileres cobrados (informe histórico)
            </Text>
            <View style={styles.row}>
              <Text style={[styles.cell1, { fontWeight: "bold" }]}>Propiedad</Text>
              <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
            </View>
            {payload.alquileres.map((a) => (
              <View key={a.propiedad_id} style={styles.row} wrap={false}>
                <Text style={styles.cell1}>{a.etiqueta}</Text>
                <Text style={styles.cellN}>{precio(a.monto)}</Text>
              </View>
            ))}

            <Text style={{ fontSize: 10.5, fontWeight: "bold", marginTop: 10, marginBottom: 4 }}>Otros conceptos</Text>
            {payload.otros_conceptos.length === 0 ? (
              <Text style={styles.muted}>Sin conceptos adicionales.</Text>
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={[styles.cell1, { fontWeight: "bold" }]}>Concepto</Text>
                  <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
                  <Text style={[styles.cellObs, { fontWeight: "bold" }]}>Obs.</Text>
                </View>
                {payload.otros_conceptos.map((o, i) => (
                  <View key={`${o.pago_id}-${i}`} style={styles.row} wrap={false}>
                    <Text style={styles.cell1}>{o.concepto}</Text>
                    <Text style={styles.cellN}>{precio(o.monto)}</Text>
                    <Text style={styles.cellObs}>{o.observaciones ?? "—"}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#000" }}>
              <View style={styles.totalLine}>
                <Text>Subtotal ingresos</Text>
                <Text style={styles.totalBold}>{precio(payload.subtotal_ingresos)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text>Total alquileres (base comisión)</Text>
                <Text>{precio(payload.total_alquileres)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text>Descuento comisión inmobiliaria</Text>
                <Text>- {precio(payload.comision_monto)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalBold}>Neto a rendir al propietario</Text>
                <Text style={styles.totalBold}>{precio(payload.neto_a_rendir)}</Text>
              </View>
            </View>
          </>
        )}

        <BloqueFirma />
      </Page>
    </Document>
  );
}
