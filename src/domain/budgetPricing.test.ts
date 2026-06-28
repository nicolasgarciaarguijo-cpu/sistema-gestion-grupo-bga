import { computeBudgetPricing, BudgetPricingInput } from "./budgetPricing";

const base: BudgetPricingInput = {
  totalMaterials: 0,
  totalBasicSupplies: 0,
  totalLabor: 0,
  totalFixedCosts: 0,
  occupancyPct: 0,
  allocationMode: "manual",
  manualAllocationPct: 0,
  deviationPct: 0,
  markupPct: 0,
  budgetIncreases: [],
  budgetDiscounts: [],
  commissionPct: 0,
  vatPct: 0,
};

describe("computeBudgetPricing", () => {
  it("sin parametros: el neto es la suma de costos base", () => {
    const r = computeBudgetPricing({ ...base, totalMaterials: 1000, totalLabor: 500 });
    expect(r.totalCost).toBe(1500);
    expect(r.netPrice).toBe(1500);
    expect(r.finalPrice).toBe(1500);
  });

  it("markup se aplica sobre el costo total", () => {
    const r = computeBudgetPricing({ ...base, totalMaterials: 1000, markupPct: 50 });
    expect(r.markupAmount).toBe(500);
    expect(r.preDiscountNetPrice).toBe(1500);
  });

  it("desvio se aplica sobre materiales + insumos + mano de obra", () => {
    const r = computeBudgetPricing({ ...base, totalMaterials: 1000, deviationPct: 10 });
    expect(r.deviationAmount).toBe(100);
    expect(r.totalCost).toBe(1100);
  });

  it("asignacion AUTO usa la ocupacion", () => {
    const r = computeBudgetPricing({
      ...base,
      totalFixedCosts: 1000,
      allocationMode: "auto",
      occupancyPct: 50,
    });
    expect(r.allocationPctUsed).toBe(50);
    expect(r.fixedCostsApplied).toBe(500);
  });

  it("asignacion MANUAL usa el porcentaje manual", () => {
    const r = computeBudgetPricing({
      ...base,
      totalFixedCosts: 1000,
      allocationMode: "manual",
      manualAllocationPct: 30,
      occupancyPct: 99,
    });
    expect(r.allocationPctUsed).toBe(30);
    expect(r.fixedCostsApplied).toBe(300);
  });

  it("aumentos suman % sobre el neto pre-descuento", () => {
    const r = computeBudgetPricing({
      ...base,
      totalMaterials: 1000,
      budgetIncreases: [{ pct: 10 }, { pct: 5 }],
    });
    expect(r.totalIncreaseAmount).toBeCloseTo(150);
    expect(r.priceBeforeDiscounts).toBeCloseTo(1150);
  });

  it("descuentos: porcentaje y monto fijo combinados", () => {
    const r = computeBudgetPricing({
      ...base,
      totalMaterials: 1000,
      budgetDiscounts: [{ mode: "porcentaje", pct: 10 }, { mode: "monto", amount: 50 }],
    });
    expect(r.totalDiscountAmount).toBe(150); // 100 (10% de 1000) + 50
    expect(r.netPrice).toBe(850);
  });

  it("el neto nunca es negativo", () => {
    const r = computeBudgetPricing({
      ...base,
      totalMaterials: 100,
      budgetDiscounts: [{ mode: "monto", amount: 9999 }],
    });
    expect(r.netPrice).toBe(0);
  });

  it("comision e IVA se aplican sobre el neto", () => {
    const r = computeBudgetPricing({
      ...base,
      totalMaterials: 1000,
      commissionPct: 10,
      vatPct: 21,
    });
    expect(r.commissionAmount).toBe(100);
    expect(r.finalPrice).toBe(1210);
  });

  it("cascada completa coherente", () => {
    const r = computeBudgetPricing({
      ...base,
      totalMaterials: 1000,
      totalLabor: 1000,
      totalFixedCosts: 1000,
      allocationMode: "manual",
      manualAllocationPct: 10,
      deviationPct: 10,
      markupPct: 100,
      budgetIncreases: [{ pct: 10 }],
      budgetDiscounts: [{ mode: "porcentaje", pct: 50 }],
      commissionPct: 5,
      vatPct: 21,
    });
    // fixed=100, desvio=200, costo=2300, markup=2300, pre=4600, +10%=5060, -50%=2530
    expect(r.fixedCostsApplied).toBe(100);
    expect(r.deviationAmount).toBe(200);
    expect(r.totalCost).toBe(2300);
    expect(r.preDiscountNetPrice).toBe(4600);
    expect(r.priceBeforeDiscounts).toBeCloseTo(5060);
    expect(r.netPrice).toBeCloseTo(2530);
  });
});
