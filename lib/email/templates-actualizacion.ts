import { BRAND_NAME } from "@/lib/constants/branding";

const CONTACTO = "+54 9 2664 791345";

type DatosContrato = {
  direccionPropiedad: string;
  nombreInquilino: string;
  emailInquilino: string | null;
  mesActualizacion: string;     // YYYY-MM del mes en que se actualiza (el siguiente al aviso)
  mesActualizacionHumano: string; // "julio de 2026"
  indice: string;               // "ICL" | "IPC"
  montoActual: number;
};

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// ─── HTML para el email al inquilino ────────────────────────────────────────

export function htmlEmailInquilino(d: DatosContrato): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="font-family:system-ui,sans-serif;background:#f5f7fa;margin:0;padding:24px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1e4d6b;padding:28px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">${BRAND_NAME}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e4d6b;font-size:18px;margin-top:0;">Recordatorio de actualización de alquiler</h2>
      <p style="color:#374151;">Estimado/a <strong>${d.nombreInquilino}</strong>,</p>
      <p style="color:#374151;">Le informamos que el próximo mes (<strong>${d.mesActualizacionHumano}</strong>) corresponde la <strong>actualización del valor</strong> de su contrato de alquiler para la propiedad:</p>

      <div style="background:#e8f4fd;border-left:4px solid #1e4d6b;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#1a2533;"><strong>📍 ${d.direccionPropiedad}</strong></p>
        <p style="margin:6px 0 0;color:#4b5563;font-size:13px;">Monto actual: <strong>${precioFmt.format(d.montoActual)}</strong></p>
        <p style="margin:4px 0 0;color:#4b5563;font-size:13px;">Índice de actualización: <strong>${d.indice}</strong></p>
      </div>

      <p style="color:#374151;">Nos comunicaremos con usted para informarle el nuevo valor una vez que se publiquen los índices oficiales. Ante cualquier consulta, no dude en contactarnos:</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:#1e4d6b;font-weight:600;">${BRAND_NAME}</p>
        <p style="margin:4px 0 0;color:#374151;">📞 ${CONTACTO}</p>
      </div>

      <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
        Este es un mensaje automático generado por el sistema de gestión de ${BRAND_NAME}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── HTML para el email al admin ─────────────────────────────────────────────

export function htmlEmailAdmin(d: DatosContrato): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="font-family:system-ui,sans-serif;background:#f5f7fa;margin:0;padding:24px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1e4d6b;padding:28px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">${BRAND_NAME} — Aviso interno</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e4d6b;font-size:18px;margin-top:0;">⚠️ Contrato pendiente de actualización</h2>
      <p style="color:#374151;">El siguiente mes (<strong>${d.mesActualizacionHumano}</strong>) vence el período y corresponde actualizar el precio del alquiler:</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#e8f4fd;">
          <td style="padding:10px 14px;font-weight:600;color:#1e4d6b;border-radius:4px 0 0 4px;">Propiedad</td>
          <td style="padding:10px 14px;color:#374151;">${d.direccionPropiedad}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600;color:#1e4d6b;">Inquilino</td>
          <td style="padding:10px 14px;color:#374151;">${d.nombreInquilino}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-weight:600;color:#1e4d6b;">Monto actual</td>
          <td style="padding:10px 14px;color:#374151;">${precioFmt.format(d.montoActual)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600;color:#1e4d6b;">Índice</td>
          <td style="padding:10px 14px;color:#374151;">${d.indice}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-weight:600;color:#1e4d6b;">Mes actualización</td>
          <td style="padding:10px 14px;color:#374151;">${d.mesActualizacionHumano}</td>
        </tr>
      </table>

      <p style="color:#374151;">Recordá actualizar el monto en el sistema y notificar al inquilino con el nuevo valor. El aviso automático ya fue enviado a <strong>${d.emailInquilino ?? "sin email registrado"}</strong>.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Texto para WhatsApp/SMS ──────────────────────────────────────────────────

export function textoWhatsApp(d: DatosContrato): string {
  return (
    `Hola ${d.nombreInquilino}! 👋\n\n` +
    `Le informamos desde *${BRAND_NAME}* que el próximo mes ` +
    `(*${d.mesActualizacionHumano}*) corresponde la *actualización del valor* ` +
    `de su alquiler en *${d.direccionPropiedad}*.\n\n` +
    `Índice aplicado: *${d.indice}*\n` +
    `Monto actual: *${precioFmt.format(d.montoActual)}*\n\n` +
    `Nos comunicaremos con usted para informarle el nuevo valor. ` +
    `Ante consultas: ${CONTACTO}`
  );
}
