import { computeBillingTotals, type BillingTotalsInput } from "./billingTotals";

const job = (over: Partial<BillingTotalsInput> = {}): BillingTotalsInput => ({
  invoicedTotal: 0,
  invoicedNet: 0,
  committedNet: 0,
  billedGross: 0,
  blackNet: 0,
  additionalsTotal: 0,
  whiteCollected: 0,
  blackCollected: 0,
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

  it("suma facturado y falta facturar (comprometido - facturado)", () => {
    const t = computeBillingTotals([
      job({ committedNet: 1000, invoicedNet: 400, invoicedTotal: 484 }),
      job({ committedNet: 500, invoicedNet: 500, invoicedTotal: 605 }),
    ]);
    expect(t.invoicedNet).toBe(900);
    expect(t.invoicedTotal).toBe(1089);
    expect(t.missingToInvoiceNet).toBe(600); // solo el primero: 1000-400
  });

  it("cobrado se separa por administracion real", () => {
    const t = computeBillingTotals([
      job({ whiteCollected: 700, blackCollected: 300 }),
      job({ whiteCollected: 100, blackCollected: 0 }),
    ]);
    expect(t.collectedWhite).toBe(800);
    expect(t.collectedBlack).toBe(300);
    expect(t.collectedTotal).toBe(1100);
  });

  it("adeudado por circuito: blanco = facturado+adic - cobrado blanco; negro = blackNet - cobrado negro", () => {
    const t = computeBillingTotals([
      job({
        billedGross: 1210,
        additionalsTotal: 0,
        blackNet: 1000,
        whiteCollected: 210,
        blackCollected: 400,
        remainingToPay: 1600,
      }),
    ]);
    expect(t.owedWhite).toBe(1000); // 1210 - 210
    expect(t.owedBlack).toBe(600); // 1000 - 400
    expect(t.owedTotal).toBe(1600); // suma de remainingToPay
  });

  it("no genera adeudado negativo (clamp a 0 por sobrepago)", () => {
    const t = computeBillingTotals([
      job({ billedGross: 100, whiteCollected: 500, blackNet: 0 }),
    ]);
    expect(t.owedWhite).toBe(0);
    expect(t.owedBlack).toBe(0);
  });

  it("blackSharePct = negro / (blanco+negro) del total comprometido", () => {
    const t = computeBillingTotals([
      job({ billedGross: 0, additionalsTotal: 0, blackNet: 250 }),
      job({ billedGross: 750, additionalsTotal: 0, blackNet: 0 }),
    ]);
    expect(t.blackSharePct).toBeCloseTo(25, 5); // 250 / 1000
  });
});
