// QUIEN PAGO EN EFECTIVO NEGRO (Nicolas, 2026-10-15): "cuando se carga el pago de una factura en efectivo
// negro debe poder elegirse una persona de la nomina para saber quien realizo ese pago. Si esa persona no
// pago con plata de caja chica, deberia haber un conteo de toda la plata que pago. Ese conteo aparece en
// Movimientos internos: no suma ni resta en ningun lado, solo muestra la situacion."
//
// Es INFORMATIVO: el pago ya salio del efectivo negro de la empresa (eso lo cuenta el pago). Aca solo se
// junta por persona lo que paso por sus manos. Los gastos de caja chica NO entran: esos ya se rinden en su
// caja. Puro y testeable.

export type PagoConPersona = {
  id: number;
  company: string;
  date: string;
  amount: number;
  administration?: string;
  paymentMethod?: string;
  pagadoPor?: string;
  supplier?: string;
  description?: string;
};

export type ConteoPersona = {
  persona: string;
  total: number;
  cantidad: number;
  ultimo: string;
  porEmpresa: Record<string, number>;
  pagos: Array<{ id: number; company: string; date: string; amount: number; detalle: string }>;
};

const clave = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Un pago cuenta si es EFECTIVO NEGRO y tiene a alguien en "quien pago".
export const esPagoNegroDePersona = (p: PagoConPersona) =>
  !!clave(p.pagadoPor || "") && p.administration === "negro" && (p.paymentMethod || "efectivo") === "efectivo";

// PAGOS CRUZADOS ENTRE EMPRESAS (Nicolas, 2026-10-15): "a la hora de pagar tengo que poder elegir la empresa;
// no deberia pasar pero podria ser que se crucen los pagos, y deberiamos ver que eso esta sucediendo".
// Una factura de una empresa cuyo pago salio de la otra. Solo se muestra; no suma ni resta.
export type PagoCruzado = {
  facturaId: number;
  pagoId: number;
  empresaFactura: string;
  empresaPaga: string;
  date: string;
  amount: number;
  detalle: string;
};

export function pagosCruzadosEntreEmpresas(
  facturas: Array<{ id: number; company: string; supplier?: string; receiptLetter?: string; invoiceNumber?: string; paidByCostEntryId?: number | null }>,
  pagos: Array<{ id: number; company: string; date: string; amount: number }>
): PagoCruzado[] {
  const porId = new Map(pagos.map((p) => [p.id, p]));
  const out: PagoCruzado[] = [];
  facturas.forEach((f) => {
    if (f.paidByCostEntryId == null) return;
    const p = porId.get(f.paidByCostEntryId);
    if (!p || String(p.company) === String(f.company)) return;
    out.push({
      facturaId: f.id,
      pagoId: p.id,
      empresaFactura: String(f.company),
      empresaPaga: String(p.company),
      date: p.date,
      amount: Number(p.amount || 0),
      detalle: [f.supplier, `${f.receiptLetter || ""} ${f.invoiceNumber || ""}`.trim()].filter(Boolean).join(" · "),
    });
  });
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function conteoPagosPorPersona(pagos: PagoConPersona[]): ConteoPersona[] {
  const map = new Map<string, ConteoPersona>();
  pagos.filter(esPagoNegroDePersona).forEach((p) => {
    const k = clave(p.pagadoPor!);
    const c = map.get(k) || { persona: p.pagadoPor!.trim(), total: 0, cantidad: 0, ultimo: "", porEmpresa: {}, pagos: [] };
    const monto = Math.max(0, Number(p.amount || 0));
    c.total = Math.round((c.total + monto) * 100) / 100;
    c.cantidad += 1;
    if ((p.date || "") > c.ultimo) c.ultimo = p.date || "";
    c.porEmpresa[p.company] = Math.round(((c.porEmpresa[p.company] || 0) + monto) * 100) / 100;
    c.pagos.push({ id: p.id, company: p.company, date: p.date, amount: monto, detalle: [p.supplier, p.description].filter(Boolean).join(" · ") });
    map.set(k, c);
  });
  return Array.from(map.values())
    .map((c) => ({ ...c, pagos: c.pagos.sort((a, b) => (b.date || "").localeCompare(a.date || "")) }))
    .sort((a, b) => b.total - a.total);
}
