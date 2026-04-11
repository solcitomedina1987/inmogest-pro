import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.45,
  },
  letterhead: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 10,
    marginBottom: 18,
  },
  brand: { fontSize: 14, fontFamily: "Helvetica", fontWeight: "bold" },
  sub: { fontSize: 9, color: "#555", marginTop: 2 },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  p: { marginBottom: 6, textAlign: "justify" },
  box: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginTop: 4,
    backgroundColor: "#fafafa",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#666",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
});

type Props = { data: ContratoLocacionPdfData };

export function ContratoLocacionPdfDocument({ data }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <Text style={styles.brand}>{"Consultora Medina & Asociados"}</Text>
          <Text style={styles.sub}>Contrato de locación — documento generado electrónicamente</Text>
        </View>

        <Text style={styles.title}>Contrato de locación de inmueble</Text>

        <Text style={styles.sectionTitle}>Fecha del contrato</Text>
        <Text style={styles.p}>{data.fechaContratoFmt}</Text>

        <Text style={styles.sectionTitle}>Locador (propietario)</Text>
        <Text style={styles.p}>{data.propietarioLine}</Text>

        <Text style={styles.sectionTitle}>Locatario (inquilino)</Text>
        <Text style={styles.p}>{data.inquilinoLine}</Text>

        <Text style={styles.sectionTitle}>Inmueble</Text>
        <Text style={styles.p}>{data.propiedadDireccion}</Text>

        <Text style={styles.sectionTitle}>Características del inmueble</Text>
        <View style={styles.box}>
          <Text style={styles.p}>{data.caracteristicas}</Text>
        </View>

        <Text style={styles.sectionTitle}>Garantes y constancias</Text>
        <View style={styles.box}>
          <Text style={styles.p}>{data.datosGarantes}</Text>
        </View>

        <Text style={styles.sectionTitle}>Plazo y canon</Text>
        <Text style={styles.p}>
          Vigencia desde el {data.fechaInicioFmt} hasta el {data.fechaFinFmt}.
        </Text>
        <Text style={styles.p}>Canon mensual: {data.valorMensualFmt}.</Text>
        <Text style={styles.p}>Tipo de ajuste / índice acordado: {data.tipoAjuste}.</Text>

        <Text style={styles.sectionTitle}>Cláusulas generales</Text>
        <Text style={styles.p}>
          Las partes declaran conocer y aceptar las condiciones de la Ley de Alquileres vigentes al momento de la
          firma. El presente documento resume los datos esenciales; las cláusulas particulares complementarias
          pueden constar en anexos firmados por las partes.
        </Text>

        <View style={styles.footer}>
          <Text>
            Documento generado por el sistema interno. Las firmas manuscritas pueden agregarse en copia impresa.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
