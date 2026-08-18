// Sugerencia de RENGLÓN del calendario (conceptKey del plan de cuentas) a partir del concepto crudo
// del extracto bancario. SOLO mapea mecánica bancaria inequívoca (impuestos, IVA, comisiones, sellos,
// intereses, tarjeta). Lo dudoso (transferencias, pagos de servicios, acreditación de sueldos) devuelve
// null a propósito: eso lo clasifica el usuario a mano. Nunca auto-aplica: solo sugiere.

const norm = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// El orden importa: las reglas más específicas van primero (ganan).
const RULES: Array<{ key: string; test: (c: string) => boolean }> = [
  // Impuesto al débito/crédito (Ley 25.413) — el más frecuente.
  { key: "b_imp_ley_25413", test: (c) => c.includes("ley 25.413") || c.includes("ley 25413") },
  { key: "b_imp_debito", test: (c) => c.includes("imp.db/cr") && c.includes("debito") },
  { key: "b_imp_credito", test: (c) => c.includes("imp.db/cr") && c.includes("credito") },
  // IVA
  { key: "b_iva_105", test: (c) => c.includes("iva") && (c.includes("10,5") || c.includes("10.5")) },
  { key: "b_iva_percepcion", test: (c) => c.includes("iva") && c.includes("percep") },
  { key: "b_iva_21", test: (c) => c.includes("iva alicuota") || (c.includes("iva") && c.includes("21")) },
  // Percepción 30% compra exterior
  { key: "b_percepcion_30", test: (c) => c.includes("percep") && (c.includes("30") || c.includes("exterior")) },
  // Sellos
  { key: "b_sellados", test: (c) => c.includes("sello") },
  // Comisiones
  { key: "b_com_paquete", test: (c) => c.includes("comision") && c.includes("paquete") },
  { key: "b_com_extraccion", test: (c) => c.includes("comision") && c.includes("extrac") },
  { key: "b_com_emision_cheques", test: (c) => c.includes("comision") && c.includes("cheque") },
  { key: "b_com_transf_otros", test: (c) => c.includes("comision") && c.includes("transf") },
  { key: "b_com_cheque_efectivo", test: (c) => c.includes("comision") && (c.includes("efectivo") || c.includes("retiro")) },
  // Intereses
  { key: "b_int_descubierto", test: (c) => c.includes("interes") && c.includes("descubierto") },
  { key: "b_int_dentro_acuerdo", test: (c) => c.includes("interes") && c.includes("dentro") },
  { key: "b_int_fuera_acuerdo", test: (c) => c.includes("interes") && c.includes("fuera") },
  // Tarjeta de crédito
  { key: "b_tarjeta_credito", test: (c) => c.includes("tarjeta") && (c.includes("visa") || c.includes("credito") || c.includes("master")) },
];

export function suggestCalendarConcept(concept: string): string | null {
  const c = norm(concept);
  if (!c) return null;
  for (const r of RULES) {
    if (r.test(c)) return r.key;
  }
  return null;
}
