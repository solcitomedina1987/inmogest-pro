import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InformeRendicionPayloadV1 } from "@/lib/informes/rendicion-types";

const precio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  logoWrap: { alignItems: "center", marginBottom: 12 },
  logo: { width: 140, maxHeight: 48, objectFit: "contain" },
  logoSub: { fontSize: 8, textAlign: "center", color: "#444", marginTop: 6, marginBottom: 16 },
  brand: { fontSize: 11, textAlign: "center", fontWeight: "bold", marginBottom: 4 },
  subBrand: { fontSize: 8, textAlign: "center", color: "#444", marginBottom: 16 },
  h1: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  meta: { fontSize: 9, marginBottom: 12, lineHeight: 1.4 },
  h2: { fontSize: 11, fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 4 },
  cell1: { flex: 2.2, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObs: { flex: 1.5, fontSize: 7.5, color: "#444" },
  totalBox: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#000" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalBold: { fontWeight: "bold", fontSize: 10 },
});

export type InformeRendicionPdfProps = {
  payload: InformeRendicionPayloadV1;
  /** ISO guardado al generar el informe */
  fechaGeneracion?: string | null;
  /** data:image/...;base64,... desde disco o undefined para solo texto de marca */
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

export function InformeRendicionPdfDocument({ payload, fechaGeneracion, logoDataUri }: InformeRendicionPdfProps) {
  const fecha = formatFechaGeneracion(fechaGeneracion);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {logoDataUri ? (
          <View style={styles.logoWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no DOM alt */}
            <Image src={logoDataUri} style={styles.logo} />
            <Text style={styles.logoSub}>Informe de rendición — documento generado electrónicamente</Text>
          </View>
        ) : (
          <>
            <Text style={styles.brand}>Consultora Medina &amp; Asociados</Text>
            <Text style={styles.subBrand}>Informe de rendición — documento generado electrónicamente</Text>
          </>
        )}

        <Text style={styles.h1}>Rendición de cobranzas</Text>
        <Text style={styles.meta}>
          Fecha de generación: {fecha}
          {"\n"}
          Propietario: {payload.propietario_nombre}
          {"\n"}
          Período rendido: {payload.mes_periodo} — Comisión inmobiliaria: {payload.comision_porcentaje}%
        </Text>

        <Text style={styles.h2}>Alquileres cobrados</Text>
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

        <Text style={styles.h2}>Otros conceptos (desglose de recibos)</Text>
        {payload.otros_conceptos.length === 0 ? (
          <Text style={{ fontSize: 8.5, color: "#666" }}>Sin conceptos adicionales en el período.</Text>
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

        <View style={styles.totalBox}>
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
      </Page>
    </Document>
  );
}
