// "Actualizar presupuesto": trae a un presupuesto vencido los precios de HOY sin tocar nada mas.
// Mismas filas, mismas cantidades, mismas horas, mismo markup/desvios/aumentos/descuentos: solo se
// corrige el precio unitario de materiales e insumos, la tarifa hora de la mano de obra y el monto de
// los costos fijos, tomandolos de donde salieron (Stock y Marcadores). Solo se aplican AUMENTOS: si
// hoy algo esta mas barato se deja el precio cotizado (la baja se informa, no se aplica). Puro.

import { matchStockForMaterial } from "./stockMatch";
import { computeBudgetPricing } from "./budgetPricing";
import type {
  BudgetSection,
  BudgetSectionTotals,
  FixedCost,
  LaborRow,
  Material,
} from "./types";

type PricedStock = { code: string; description: string; unitPrice: number };
type PricedSupplyMarker = { id: number; description: string; unitPrice: number };
type PricedLaborMarker = { id: number; company: string; category: string; hourlyRate: number };
type PricedFixedCost = { id?: number; description: string; amount: number };

export type PriceRefreshSources = {
  stockItems: PricedStock[]; // stock general activo
  supplyMarkers: PricedSupplyMarker[]; // marcadores de insumos activos del tipo de trabajo
  laborMarkers: PricedLaborMarker[]; // marcadores de mano de obra activos del tipo de trabajo
  fixedCosts: PricedFixedCost[]; // costos fijos vigentes (marcadores + analisis de costos)
  company: string; // empresa del presupuesto: desempata marcadores de MO con la misma categoria
};

export type PriceChangeKind = "Material" | "Insumo" | "Mano de obra" | "Costo fijo";

export type PriceChange = {
  block: string;
  kind: PriceChangeKind;
  description: string;
  before: number;
  after: number;
};

export type SectionRows = {
  materials: Material[];
  basicSupplies: Material[];
  labor: LaborRow[];
  fixedCosts: FixedCost[];
};

export type PriceRefreshResult<T extends SectionRows> = {
  rows: T;
  changes: PriceChange[];
  decreasesKept: number; // precios que hoy estan mas bajos y se dejaron como estaban
};

const norm = (value: string | undefined) => (value || "").trim().toLowerCase();
// Tolerancia de centavos: diferencias de redondeo no cuentan como aumento.
const isIncrease = (before: number, after: number) => after - before > 0.005;
const isDecrease = (before: number, after: number) => before - after > 0.005;

export function refreshSectionPrices<T extends SectionRows>(
  section: T,
  sources: PriceRefreshSources,
  block: string
): PriceRefreshResult<T> {
  const changes: PriceChange[] = [];
  let decreasesKept = 0;

  const stockByCode = new Map(sources.stockItems.map((s) => [norm(s.code), s] as const));
  const stockByDescription = new Map(sources.stockItems.map((s) => [norm(s.description), s] as const));
  const supplyById = new Map(sources.supplyMarkers.map((m) => [m.id, m] as const));
  const supplyByDescription = new Map(sources.supplyMarkers.map((m) => [norm(m.description), m] as const));
  const laborById = new Map(sources.laborMarkers.map((m) => [m.id, m] as const));
  const fixedById = new Map(
    sources.fixedCosts.filter((f) => f.id !== undefined).map((f) => [f.id as number, f] as const)
  );
  const fixedByDescription = new Map(sources.fixedCosts.map((f) => [norm(f.description), f] as const));

  const laborByCategory = (category: string) => {
    const candidates = sources.laborMarkers.filter((m) => norm(m.category) === norm(category));
    return candidates.find((m) => m.company === sources.company) || candidates[0] || null;
  };

  // Decide el precio nuevo: sube si el actual es mayor; si es menor lo deja y lo cuenta.
  const resolve = (kind: PriceChangeKind, description: string, before: number, current?: number) => {
    if (current === undefined || !Number.isFinite(current) || current <= 0) return before;
    if (isIncrease(before, current)) {
      changes.push({ block, kind, description, before, after: current });
      return current;
    }
    if (isDecrease(before, current)) decreasesKept += 1;
    return before;
  };

  const materials = section.materials.map((row) => {
    const stock = matchStockForMaterial(row, stockByCode, stockByDescription) as PricedStock | null;
    const marker = row.sourceMarkerId ? supplyById.get(row.sourceMarkerId) : undefined;
    const current = stock ? Number(stock.unitPrice) : marker ? Number(marker.unitPrice) : undefined;
    const unitPrice = resolve("Material", row.description, Number(row.unitPrice || 0), current);
    return unitPrice === row.unitPrice ? row : { ...row, unitPrice };
  });

  const basicSupplies = section.basicSupplies.map((row) => {
    const marker =
      (row.sourceMarkerId ? supplyById.get(row.sourceMarkerId) : undefined) ||
      supplyByDescription.get(norm(row.description));
    const stock = !marker && row.stockCode ? stockByCode.get(norm(row.stockCode)) : undefined;
    const current = marker ? Number(marker.unitPrice) : stock ? Number(stock.unitPrice) : undefined;
    const unitPrice = resolve("Insumo", row.description, Number(row.unitPrice || 0), current);
    return unitPrice === row.unitPrice ? row : { ...row, unitPrice };
  });

  const labor = section.labor.map((row) => {
    const marker =
      (row.sourceMarkerId ? laborById.get(row.sourceMarkerId) : undefined) || laborByCategory(row.category);
    const current = marker ? Number(marker.hourlyRate) : undefined;
    const hourlyRate = resolve("Mano de obra", row.category, Number(row.hourlyRate || 0), current);
    return hourlyRate === row.hourlyRate ? row : { ...row, hourlyRate };
  });

  const fixedCosts = section.fixedCosts.map((row) => {
    const source =
      (row.sourceMarkerId ? fixedById.get(row.sourceMarkerId) : undefined) ||
      fixedByDescription.get(norm(row.description));
    const current = source ? Number(source.amount) : undefined;
    const amount = resolve("Costo fijo", row.description, Number(row.amount || 0), current);
    return amount === row.amount ? row : { ...row, amount };
  });

  return {
    rows: { ...section, materials, basicSupplies, labor, fixedCosts },
    changes,
    decreasesKept,
  };
}

export type SectionPricingParams = {
  laborDeviationPct: number;
  nominalLaborHoursPerEmployee: number;
  allocationMode: string;
  manualAllocationPct: number;
  deviationPct: number;
  markupPct: number;
  commissionPct: number;
  vatPct: number;
};

// Totales de un bloque guardado, con la MISMA cuenta que hace el editor para el bloque actual
// (mano de obra con su desvio, ocupacion, asignacion de fijos y la cascada de precio). Hace falta
// porque los subpresupuestos guardan sus totales y, si cambian los precios, hay que rehacerlos.
export function computeSectionTotals(
  section: Pick<BudgetSection, "materials" | "basicSupplies" | "labor" | "fixedCosts" | "increases" | "discounts">,
  p: SectionPricingParams
): BudgetSectionTotals {
  const sumQtyPrice = (rows: Material[]) =>
    rows.reduce((acc, r) => acc + Number(r.qty || 0) * Number(r.unitPrice || 0), 0);
  const totalMaterials = sumQtyPrice(section.materials);
  const totalBasicSupplies = sumQtyPrice(section.basicSupplies);

  let totalLabor = 0;
  let laborDeviationAmount = 0;
  let totalJobHours = 0;
  let totalAvailableHours = 0;
  section.labor.forEach((row) => {
    const base = Number(row.hourlyRate || 0);
    const adjusted = base * (1 + p.laborDeviationPct / 100);
    const hours = Number(row.jobHours || 0);
    totalLabor += hours * adjusted;
    laborDeviationAmount += hours * Math.max(0, adjusted - base);
    totalJobHours += hours;
    totalAvailableHours += Number(row.employees || 0) * Number(p.nominalLaborHoursPerEmployee || 198);
  });
  const occupancyPct = totalAvailableHours > 0 ? (totalJobHours / totalAvailableHours) * 100 : 0;
  const totalFixedCosts = section.fixedCosts.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const pricing = computeBudgetPricing({
    totalMaterials,
    totalBasicSupplies,
    totalLabor,
    totalFixedCosts,
    occupancyPct,
    allocationMode: p.allocationMode,
    manualAllocationPct: p.manualAllocationPct,
    deviationPct: p.deviationPct,
    markupPct: p.markupPct,
    budgetIncreases: section.increases || [],
    budgetDiscounts: section.discounts || [],
    commissionPct: p.commissionPct,
    vatPct: p.vatPct,
  });

  return {
    totalMaterials,
    totalBasicSupplies,
    totalLabor,
    laborDeviationAmount,
    fixedCostsApplied: pricing.fixedCostsApplied,
    deviationAmount: pricing.deviationAmount,
    totalCost: pricing.totalCost,
    totalIncreaseAmount: pricing.totalIncreaseAmount,
    preDiscountNetPrice: pricing.preDiscountNetPrice,
    totalDiscountAmount: pricing.totalDiscountAmount,
    netPrice: pricing.netPrice,
    finalPrice: pricing.finalPrice,
    totalJobHours,
    totalAvailableHours,
    occupancyPct,
  };
}
