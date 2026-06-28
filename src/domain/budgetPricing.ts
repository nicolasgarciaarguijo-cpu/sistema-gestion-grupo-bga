// Calculo puro de precios de un presupuesto (o seccion). A partir de los costos base
// y los parametros economicos, deriva la cascada: asignacion de costos fijos -> desvio ->
// costo total -> markup -> aumentos -> descuentos -> neto -> comision -> precio final con IVA.
// Es la matematica del dinero del sistema; sin estado ni efectos, 100% testeable.

export type BudgetPricingInput = {
  totalMaterials: number;
  totalBasicSupplies: number;
  totalLabor: number;
  totalFixedCosts: number;
  occupancyPct: number;
  allocationMode: string; // "auto" | "manual"
  manualAllocationPct: number;
  deviationPct: number;
  markupPct: number;
  budgetIncreases: Array<{ pct?: number }>;
  budgetDiscounts: Array<{ mode?: string; pct?: number; amount?: number }>;
  commissionPct: number;
  vatPct: number;
};

export type BudgetPricing = {
  allocationPctUsed: number;
  fixedCostsApplied: number;
  deviationAmount: number;
  totalCost: number;
  markupAmount: number;
  preDiscountNetPrice: number;
  totalIncreaseAmount: number;
  priceBeforeDiscounts: number;
  totalDiscountAmount: number;
  netPrice: number;
  commissionAmount: number;
  finalPrice: number;
};

export function computeBudgetPricing(i: BudgetPricingInput): BudgetPricing {
  // Asignacion de costos fijos: automatica (segun ocupacion) o manual.
  const allocationPctUsed =
    i.allocationMode === "auto" ? i.occupancyPct : i.manualAllocationPct;
  const fixedCostsApplied = i.totalFixedCosts * (allocationPctUsed / 100);
  const deviationAmount =
    (i.totalMaterials + i.totalBasicSupplies + i.totalLabor) * (i.deviationPct / 100);
  const totalCost =
    i.totalMaterials + i.totalBasicSupplies + i.totalLabor + fixedCostsApplied + deviationAmount;
  const markupAmount = totalCost * (i.markupPct / 100);
  const preDiscountNetPrice = totalCost + markupAmount;
  // Aumentos: % sobre el neto pre-descuento.
  const totalIncreaseAmount = i.budgetIncreases.reduce(
    (acc, item) => acc + preDiscountNetPrice * (Number(item.pct || 0) / 100),
    0
  );
  const priceBeforeDiscounts = preDiscountNetPrice + totalIncreaseAmount;
  // Descuentos: % sobre el precio con aumentos, o monto fijo.
  const totalDiscountAmount = i.budgetDiscounts.reduce(
    (acc, item) =>
      acc +
      (item.mode === "porcentaje"
        ? priceBeforeDiscounts * (Number(item.pct || 0) / 100)
        : Number(item.amount || 0)),
    0
  );
  const netPrice = Math.max(0, priceBeforeDiscounts - totalDiscountAmount);
  const commissionAmount = netPrice * (i.commissionPct / 100);
  const finalPrice = netPrice * (1 + i.vatPct / 100);

  return {
    allocationPctUsed,
    fixedCostsApplied,
    deviationAmount,
    totalCost,
    markupAmount,
    preDiscountNetPrice,
    totalIncreaseAmount,
    priceBeforeDiscounts,
    totalDiscountAmount,
    netPrice,
    commissionAmount,
    finalPrice,
  };
}
