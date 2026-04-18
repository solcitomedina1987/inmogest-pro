import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InformeRendicionPayload } from "@/lib/informes/rendicion-types";

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
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 10, marginBottom: 4 },
  sectionHint: { fontSize: 7.5, color: "#555", marginBottom: 6, lineHeight: 1.35 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 4 },
  cell1: { flex: 2.2, fontSize: 8.5 },
  cellMid: { flex: 1.1, fontSize: 8.5 },
  cellN: { flex: 1, fontSize: 8.5, textAlign: "right" },
  cellObs: { flex: 1.5, fontSize: 7.5, color: "#444" },
  totalBox: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#000" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalBold: { fontWeight: "bold", fontSize: 10 },
  totalHuge: { fontWeight: "bold", fontSize: 11, marginTop: 4 },
  muted: { color: "#555", fontSize: 8.5 },
  signArea: { marginTop: 28, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#bbb" },
  signLabel: { fontSize: 8, color: "#444", textAlign: "center", marginBottom: 28 },
  signLine: { borderBottomWidth: 0.75, borderBottomColor: "#333", marginHorizontal: 72, marginBottom: 6 },
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

        {payload.v === 2 ? (
          <>
            <Text style={styles.sectionTitle}>Rendición de Alquileres (comisionable)</Text>
            <Text style={styles.sectionHint}>
              Solo ítems registrados como Alquiler en cada recibo. La comisión se aplica únicamente sobre la suma de
              este bloque.
            </Text>
            <View style={styles.row}>
              <Text style={[styles.cell1, { fontWeight: "bold" }]}>Propiedad</Text>
              <Text style={[styles.cellMid, { fontWeight: "bold" }]}>Concepto</Text>
              <Text style={[styles.cellN, { fontWeight: "bold" }]}>Monto</Text>
            </View>
            {payload.alquileres.length === 0 ? (
              <Text style={styles.muted}>Sin alquileres en el período.</Text>
            ) : (
              payload.alquileres.map((a) => (
                <View key={a.pago_id} style={styles.row} wrap={false}>
                  <Text style={styles.cell1}>{a.etiqueta}</Text>
                  <Text style={styles.cellMid}>Alquiler</Text>
                  <Text style={styles.cellN}>{precio(a.monto)}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Detalle de Servicios y Otros Conceptos (no comisionable)</Text>
            <Text style={styles.sectionHint}>
              Desglose informativo; no se descuenta comisión sobre estos importes.
            </Text>
            {payload.otros_conceptos.length === 0 ? (
              <Text style={styles.muted}>Sin otros conceptos en el período.</Text>
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
                <Text>Total Alquileres Cobrados</Text>
                <Text style={styles.totalBold}>{precio(payload.total_alquileres_cobrados)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text>Comisión Inmobiliaria ({payload.comision_porcentaje}%)</Text>
                <Text>- {precio(payload.comision_monto)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Neto alquileres (tras comisión)</Text>
                <Text>{precio(payload.neto_alquileres)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Subtotal Otros Conceptos (informativo)</Text>
                <Text style={styles.muted}>{precio(payload.subtotal_otros_conceptos)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalHuge}>TOTAL NETO A RENDIR AL DUEÑO</Text>
                <Text style={styles.totalHuge}>{precio(payload.total_neto_a_rendir)}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Alquileres cobrados (informe histórico)</Text>
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

            <Text style={styles.sectionTitle}>Otros conceptos</Text>
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
          </>
        )}

        <BloqueFirma />
      </Page>
    </Document>
  );
}
