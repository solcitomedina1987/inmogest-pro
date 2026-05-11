/** Solo dígitos para https://wa.me/NUMERO (sin +, espacios, guiones). */
export function telefonoDigitosParaWhatsApp(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

export function urlWhatsApp(telefono: string): string | null {
  const d = telefonoDigitosParaWhatsApp(telefono);
  if (!d) {
    return null;
  }
  return `https://wa.me/${d}`;
}
