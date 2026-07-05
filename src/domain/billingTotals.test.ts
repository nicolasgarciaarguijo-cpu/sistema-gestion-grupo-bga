import { computeBillingTotals, type BillingTotalsInput } from "./billingTotals";

const job = (over: Partial<BillingTotalsInput> = {}): BillingTotalsInput => ({
  invoicedTotalPeriod: 0,
  invoicedNetPeriod: 0,
  committedNet: 0,
  invoicedNetAllTime: 0,
  billedGross: 0,
  blackNet: 0,
  additionalsTotal: 0,
  whiteCollectedPeriod: 0,
  blackCollectedPeriod: 0,
  whiteCollectedAllTime: 0,
  blackCollectedAllTime: 0,
  remainingToPay: 0,
  ...over,
});

describe("computeBillingTotals", () => {
  it("conjunto vacio = todo cero", () => {
    const t = computeBillingTotals([]);
    expect(t.count).toBe(0);
    expect(t.collectedTotal).toBe(0);
    expect(t.blackSharePct).toBe(0);
  });

  it("facturado suma solo lo del periodo", () => {
    const t = computeBillingTotals([
      job({ invoicedTotalPeriod: 484, invoicedNetPeriod: 400 }),
      job({ invoicedTotalPeriod: 605, invoicedNetPeriod: 500 }),
    ]);
    expect(t.invoicedNet).toBe(900);
    expect(t.invoicedTotal).toBe(1089);
  });

  it("falta facturar usa el historico (committed - facturado historico), no el periodo", () => {
    const t = computeBillingTotals([
      job({ committedNet: 1000, invoicedNetAllTime: 400, invoicedNetPeriod: 0 }),
    ]);
    expect(t.missingToInvoiceNet).toBe(600);
  });

  it("cobrado del periodo se separa por administracion real", () => {
    const t = computeBillingTotals([
      job({ whiteCollectedPeriod: 700, blackCollectedPeriod: 300 }),
      job({ whiteCollectedPeriod: 100 }),
    ]);
    expect(t.collectedWhite).toBe(800);
    expect(t.collectedBlack).toBe(300);
    expect(t.collectedTotal).toBe(1100);
  });

  it("adeudado por circuito usa cobrado historico; total = suma de remainingToPay", () => {
    const t = computeBillingTotals([
      job({
        billedGross: 1210,
        blackNet: 1000,
        whiteCollectedAllTime: 210,
        blackCollectedAllTime: 400,
        remainingToPay: 1600,
      }),
    ]);
    expect(t.owedWhite).toBe(1000); // 1210 - 210
    expect(t.owedBlack).toBe(600); // 1000 - 400
    expect(t.owedTotal).toBe(1600);
  });

  it("no genera adeudado negativo (clamp a 0)", () => {
    const t = computeBillingTotals([
      job({ billedGross: 100, whiteCollectedAllTime: 500, blackNet: 0 }),
    ]);
    expect(t.owedWhite).toBe(0);
    expect(t.owedBlack).toBe(0);
  });

  it("blackSharePct = negro / (blanco+negro) comprometido", () => {
    const t = computeBillingTotals([
      job({ billedGross: 0, blackNet: 250 }),
      job({ billedGross: 750, blackNet: 0 }),
    ]);
    expect(t.blackSharePct).toBeCloseTo(25, 5);
  });
});
