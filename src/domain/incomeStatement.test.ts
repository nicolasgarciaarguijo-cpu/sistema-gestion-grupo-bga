import { computeIncomeStatement, type IncomeStatementInput } from "./incomeStatement";

const base: IncomeStatementInput = {
  collectedWhite: 0,
  collectedBlack: 0,
  purchasesWhite: 0,
  purchasesBlack: 0,
  pettyCashWhite: 0,
  pettyCashBlack: 0,
  commissionsPaid: 0,
  bankCredits: 0,
  bankDebits: 0,
};

describe("computeIncomeStatement", () => {
  it("resultado blanco = cobros blanco - (compras+caja+comisiones) blanco", () => {
    const r = computeIncomeStatement({
      ...base,
      collectedWhite: 1000,
      purchasesWhite: 300,
      pettyCashWhite: 50,
      commissionsPaid: 100,
    });
    expect(r.whiteExpense).toBe(450);
    expect(r.whiteResult).toBe(550);
  });

  it("resultado negro = cobros negro - (compras+caja) negro", () => {
    const r = computeIncomeStatement({
      ...base,
      collectedBlack: 800,
      purchasesBlack: 200,
      pettyCashBlack: 100,
    });
    expect(r.blackExpense).toBe(300);
    expect(r.blackResult).toBe(500);
  });

  it("total, desfasaje y % negro", () => {
    const r = computeIncomeStatement({
      ...base,
      collectedWhite: 1000,
      collectedBlack: 1000,
      purchasesWhite: 400,
      purchasesBlack: 100,
    });
    expect(r.totalIncome).toBe(2000);
    expect(r.totalExpense).toBe(500);
    expect(r.totalResult).toBe(1500);
    expect(r.blackSharePct).toBeCloseTo(50, 5);
    expect(r.desfasaje).toBe(r.whiteResult - r.blackResult); // 600 - 900 = -300
    expect(r.desfasaje).toBe(-300);
  });

  it("banco va aparte (no cambia el resultado operativo) y netea", () => {
    const r = computeIncomeStatement({
      ...base,
      collectedWhite: 500,
      bankCredits: 900,
      bankDebits: 200,
    });
    expect(r.whiteResult).toBe(500); // banco no entra al resultado
    expect(r.netBank).toBe(700);
  });

  it("sin datos = todo cero", () => {
    const r = computeIncomeStatement(base);
    expect(r.totalResult).toBe(0);
    expect(r.blackSharePct).toBe(0);
  });
});
