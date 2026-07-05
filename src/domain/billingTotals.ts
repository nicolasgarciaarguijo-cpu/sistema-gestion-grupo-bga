// Sumatoria/balance de facturacion y cobranza sobre un conjunto de trabajos. Todo lo REAL sale de
// facturas y pagos; el circuito (blanco/negro) del ADEUDADO es una estimacion: blanco = lo facturado
// (con IVA) + adicionales; negro = el resto del neto (blackNet). Lo cobrado por circuito sale de la
// administracion real de cada pago (retenciones cuentan como blanco). Pensado para un balance anual.

export type BillingTotalsInput = {
  invoicedTotal: number; // bruto facturado (con IVA) = suma de totales de facturas
  invoicedNet: number; // neto facturado = suma de subtotales de facturas
  committedNet: number; // neto que el trabajo se comprometio a facturar (neto * %facturado)
  billedGross: number; // bruto comprometido/emitido en blanco (neto factura + IVA)
  blackNet: number; // neto que corre por negro (no facturado)
  additionalsTotal: number; // adicionales (se consideran circuito blanco)
  whiteCollected: number; // cobrado en blanco (pagos blanco + retenciones)
  blackCollected: number; // cobrado en negro (pagos negro)
  remainingToPay: number; // saldo total a cobrar del trabajo (autoritativo)
};

export type BillingTotals = {
  count: number;
  invoicedTotal: number;
  invoicedNet: number;
  missingToInvoiceNet: number; // neto que falta facturar (comprometido - facturado)
  collectedTotal: number;
  collectedWhite: number;
  collectedBlack: number;
  owedTotal: number; // saldo total a cobrar (suma de remainingToPay)
  owedWhite: number; // saldo estimado circuito blanco
  owedBlack: number; // saldo estimado circuito negro
  blackSharePct: number; // % del total (facturado+negro) que corre por negro
};

const ZERO: BillingTotals = {
  count: 0,
  invoicedTotal: 0,
  invoicedNet: 0,
  missingToInvoiceNet: 0,
  collectedTotal: 0,
  collectedWhite: 0,
  collectedBlack: 0,
  owedTotal: 0,
  owedWhite: 0,
  owedBlack: 0,
  blackSharePct: 0,
};

export function computeBillingTotals(jobs: BillingTotalsInput[]): BillingTotals {
  const t: BillingTotals = { ...ZERO };
  let whiteBase = 0;
  let blackBase = 0;
  for (const j of jobs) {
    const whiteToCollect = j.billedGross + j.additionalsTotal;
    const blackToCollect = j.blackNet;
    t.count += 1;
    t.invoicedTotal += j.invoicedTotal;
    t.invoicedNet += j.invoicedNet;
    t.missingToInvoiceNet += Math.max(0, j.committedNet - j.invoicedNet);
    t.collectedWhite += j.whiteCollected;
    t.collectedBlack += j.blackCollected;
    t.owedTotal += j.remainingToPay;
    t.owedWhite += Math.max(0, whiteToCollect - j.whiteCollected);
    t.owedBlack += Math.max(0, blackToCollect - j.blackCollected);
    whiteBase += whiteToCollect;
    blackBase += blackToCollect;
  }
  t.collectedTotal = t.collectedWhite + t.collectedBlack;
  const base = whiteBase + blackBase;
  t.blackSharePct = base > 0 ? (blackBase / base) * 100 : 0;
  return t;
}
