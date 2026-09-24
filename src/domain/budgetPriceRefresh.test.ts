import { refreshSectionPrices, computeSectionTotals } from "./budgetPriceRefresh";

const sources = {
  stockItems: [
    { code: "MEL-001", description: "Melamina blanca", unitPrice: 50000 },
    { code: "HER-001", description: "Herrajes Hafele", unitPrice: 100000 },
  ],
  supplyMarkers: [{ id: 10, description: "Flete", unitPrice: 30000 }],
  laborMarkers: [
    { id: 20, company: "BGA", category: "Oficial", hourlyRate: 9000 },
    { id: 21, company: "De Raiz", category: "Ayudante", hourlyRate: 6000 },
    { id: 22, company: "BGA", category: "Ayudante", hourlyRate: 6500 },
  ],
  fixedCosts: [
    { id: 30, description: "Estructura - Alquiler", amount: 400000 },
    { description: "Servicios - Analisis de costos", amount: 120000 },
  ],
  company: "BGA",
};

const section = {
  title: "Cocina",
  materials: [
    { id: 1, description: "Melamina blanca", qty: 8, unit: "placas", unitPrice: 42500, stockCode: "MEL-001" },
    { id: 2, description: "Herrajes Hafele", qty: 1, unit: "set", unitPrice: 138000 }, // hoy mas barato
    { id: 3, description: "Algo a mano", qty: 2, unit: "u", unitPrice: 1000 }, // sin origen
  ],
  basicSupplies: [{ id: 4, description: "Flete", qty: 1, unit: "u", unitPrice: 25000, sourceMarkerId: 10 }],
  labor: [
    { id: 5, category: "Oficial", employees: 2, monthlyHoursPerEmployee: 198, hourlyRate: 8000, jobHours: 40, sourceMarkerId: 20 },
    { id: 6, category: "ayudante", employees: 1, monthlyHoursPerEmployee: 198, hourlyRate: 5000, jobHours: 20 },
  ],
  fixedCosts: [
    { id: 7, description: "Estructura - Alquiler", amount: 350000, sourceMarkerId: 30 },
    { id: 8, description: "Servicios - Analisis de costos", amount: 100000 },
  ],
};

describe("refreshSectionPrices", () => {
  const result = refreshSectionPrices(section, sources, "Cocina");

  it("sube el material al precio de stock actual y no toca la cantidad", () => {
    expect(result.rows.materials[0]).toMatchObject({ qty: 8, unitPrice: 50000 });
  });

  it("si hoy esta mas barato deja el precio cotizado y lo cuenta", () => {
    expect(result.rows.materials[1].unitPrice).toBe(138000);
    expect(result.decreasesKept).toBe(1);
  });

  it("lo cargado a mano sin origen queda igual", () => {
    expect(result.rows.materials[2]).toBe(section.materials[2]);
  });

  it("insumo del marcador, mano de obra por id y por categoria (prefiere la empresa)", () => {
    expect(result.rows.basicSupplies[0].unitPrice).toBe(30000);
    expect(result.rows.labor[0]).toMatchObject({ hourlyRate: 9000, jobHours: 40 });
    expect(result.rows.labor[1].hourlyRate).toBe(6500);
  });

  it("costos fijos: marcador por id y analisis de costos por descripcion", () => {
    expect(result.rows.fixedCosts.map((r) => r.amount)).toEqual([400000, 120000]);
  });

  it("informa cada aumento con antes y despues", () => {
    expect(result.changes).toHaveLength(6);
    expect(result.changes[0]).toEqual({
      block: "Cocina",
      kind: "Material",
      description: "Melamina blanca",
      before: 42500,
      after: 50000,
    });
  });

  it("sin cambios devuelve las mismas filas", () => {
    const again = refreshSectionPrices(result.rows, sources, "Cocina");
    expect(again.changes).toHaveLength(0);
    expect(again.rows.materials[0]).toBe(result.rows.materials[0]);
  });
});

describe("computeSectionTotals", () => {
  it("replica la cuenta del editor (desvio MO, ocupacion, fijos, markup, IVA)", () => {
    const totals = computeSectionTotals(
      {
        materials: [{ id: 1, description: "m", qty: 2, unit: "u", unitPrice: 100 }],
        basicSupplies: [{ id: 2, description: "i", qty: 1, unit: "u", unitPrice: 50 }],
        labor: [{ id: 3, category: "o", employees: 1, monthlyHoursPerEmployee: 200, hourlyRate: 10, jobHours: 50 }],
        fixedCosts: [{ id: 4, description: "f", amount: 1000 }],
        increases: [],
        discounts: [],
      },
      {
        laborDeviationPct: 10,
        nominalLaborHoursPerEmployee: 200,
        allocationMode: "auto",
        manualAllocationPct: 0,
        deviationPct: 0,
        markupPct: 0,
        commissionPct: 0,
        vatPct: 21,
      }
    );
    expect(totals.totalMaterials).toBe(200);
    expect(totals.totalLabor).toBeCloseTo(550);
    expect(totals.laborDeviationAmount).toBeCloseTo(50);
    expect(totals.occupancyPct).toBe(25);
    expect(totals.fixedCostsApplied).toBe(250);
    expect(totals.netPrice).toBeCloseTo(1050);
    expect(totals.finalPrice).toBeCloseTo(1270.5);
  });
});
