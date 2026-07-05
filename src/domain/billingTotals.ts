// Sumatoria/balance de facturacion y cobranza sobre un conjunto de trabajos, para un PERIODO.
// Distingue dos cosas:
//  - FLUJOS del periodo: facturado (por fecha de factura) y cobrado (por fecha de pago) que caen en el
//    periodo elegido. Sirven para el balance del ano/mes.
//  - SALDOS a la fecha: lo que falta facturar y lo que se adeuda cobrar, que son acumulados a hoy (no
//    dependen del periodo). El circuito (blanco/negro) del adeudado es estimado: blanco = lo facturado
//    (con IVA) + adicionales; negro = el resto del neto (blackNet).
// El que arma los inputs (App) ya filtro facturas/pagos por fecha; aca solo se suma.

export type BillingTotalsInput = {
  invoicedTotalPeriod: number; // bruto facturado (con IVA) dentro del periodo
  invoicedNetPeriod: number; // neto facturado dentro del periodo
  committedNet: number; // neto comprometido a facturar (neto * %facturado) - a la fecha
  invoicedNetAllTime: number; // neto facturado historico (todas las facturas) - a la fecha
  billedGross: number; // bruto comprometido/emitido en blanco (neto factura + IVA) - a la fecha
  blackNet: number; // neto que corre por negro (no facturado) - a la fecha
  additionalsTotal: number; // adicionales (circuito blanco) - a la fecha
  whiteCollectedPeriod: number; // cobrado en blanco dentro del periodo (pagos)
  blackCollectedPeriod: number; // cobrado en negro dentro del periodo (pagos)
  whiteCollectedAllTime: number; // cobrado en blanco historico (pagos + retenciones) - a la fecha
  blackCollectedAllTime: number; // cobrado en negro historico - a la fecha
  remainingToPay: number; // saldo total a cobrar del trabajo (autoritativo) - a la fecha
};

export type BillingTotals = {
  count: number;
  // Flujos del periodo
  invoicedTotal: number;
  invoicedNet: number;
  collectedTotal: number;
  collectedWhite: number;
  collectedBlack: number;
  // Saldos a la fecha
  missingToInvoiceNet: number;
  owedTotal: number;
  owedWhite: number;
  owedBlack: number;
  blackSharePct: number;
};

const ZERO: BillingTotals = {
  count: 0,
  invoicedTotal: 0,
  invoicedNet: 0,
  collectedTotal: 0,
  collectedWhite: 0,
  collectedBlack: 0,
  missingToInvoiceNet: 0,
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
    // flujos del periodo
    t.invoicedTotal += j.invoicedTotalPeriod;
    t.invoicedNet += j.invoicedNetPeriod;
    t.collectedWhite += j.whiteCollectedPeriod;
    t.collectedBlack += j.blackCollectedPeriod;
    // saldos a la fecha
    t.missingToInvoiceNet += Math.max(0, j.committedNet - j.invoicedNetAllTime);
    t.owedTotal += j.remainingToPay;
    t.owedWhite += Math.max(0, whiteToCollect - j.whiteCollectedAllTime);
    t.owedBlack += Math.max(0, blackToCollect - j.blackCollectedAllTime);
    whiteBase += whiteToCollect;
    blackBase += blackToCollect;
  }
  t.collectedTotal = t.collectedWhite + t.collectedBlack;
  const base = whiteBase + blackBase;
  t.blackSharePct = base > 0 ? (blackBase / base) * 100 : 0;
  return t;
}
