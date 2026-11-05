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
