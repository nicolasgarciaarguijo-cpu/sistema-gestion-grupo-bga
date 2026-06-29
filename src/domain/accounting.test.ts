import { computeAccountingResults, AccountingInput } from "./accounting";

const base: AccountingInput = {
  whiteIncome: 0,
  blackIncome: 0,
  whitePurchases: 0,
  blackPurchases: 0,
  pettyCashBlack: 0,
  commissions: 0,
  depreciation: 0,
  bankCredits: 0,
  bankDebits: 0,
  premioWhite: 0,
  premioBlack: 0,
};

describe("computeAccountingResults", () => {
  it("circuito blanco: ingresos - (compras+comision+amort+egreso banco+premio) + ingreso banco", () => {
    const r = computeAccountingResults({
      ...base,
      whiteIncome: 100000,
      whitePurchases: 30000,
      commissions: 5000,
      depreciation: 2000,
      bankCredits: 1000,
      bankDebits: 3000,
      premioWhite: 4000,
    });
    expect(r.whiteExpense).toBe(44000); // 30000+5000+2000+3000+4000
    expect(r.whiteResult).toBe(100000 + 1000 - 44000); // 57000
  });

  it("circuito negro: ingreso negro - (compras negras + caja negra + premio negro)", () => {
    const r = computeAccountingResults({
      ...base,
      blackIncome: 50000,
      blackPurchases: 10000,
      pettyCashBlack: 5000,
      premioBlack: 2000,
    });
    expect(r.blackExpense).toBe(17000);
    expect(r.blackResult).toBe(33000);
  });

  it("resultado total = blanco + negro", () => {
    const r = computeAccountingResults({ ...base, whiteIncome: 100000, blackIncome: 50000 });
    expect(r.totalResult).toBe(150000);
  });

  it("% en negro sobre ingresos totales", () => {
    const r = computeAccountingResults({ ...base, whiteIncome: 75000, blackIncome: 25000 });
    expect(r.blackSharePct).toBeCloseTo(25);
  });

  it("desfasaje = resultado blanco - resultado negro", () => {
    const r = computeAccountingResults({ ...base, whiteIncome: 100000, blackIncome: 30000 });
    expect(r.desfasaje).toBe(100000 - 30000);
  });

  it("sin datos no rompe (0)", () => {
    const r = computeAccountingResults(base);
    expect(r.totalResult).toBe(0);
    expect(r.blackSharePct).toBe(0);
  });
});
