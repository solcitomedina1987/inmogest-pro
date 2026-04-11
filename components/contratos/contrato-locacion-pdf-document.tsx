import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#111",
    lineHeight: 1.38,
  },
  letterhead: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#333",
    paddingBottom: 8,
    marginBottom: 12,
  },
  brand: { fontSize: 11, fontFamily: "Helvetica", fontWeight: "bold" },
  sub: { fontSize: 8, color: "#555", marginTop: 2 },
  body: {
    textAlign: "justify",
  },
  footer: {
    marginTop: 14,
    fontSize: 7.5,
    color: "#666",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
  },
});

type Props = { data: ContratoLocacionPdfData };

export function ContratoLocacionPdfDocument({ data }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.letterhead} fixed={false}>
          <Text style={styles.brand}>{"Consultora Medina & Asociados"}</Text>
          <Text style={styles.sub}>Contrato de locación — documento generado electrónicamente</Text>
        </View>
        <Text style={styles.body} wrap>
          {data.bodyText}
        </Text>
        <View style={styles.footer}>
          <Text wrap>
            Documento generado por el sistema interno. Las firmas manuscritas y la legalización notarial se completan
            en copia impresa.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
