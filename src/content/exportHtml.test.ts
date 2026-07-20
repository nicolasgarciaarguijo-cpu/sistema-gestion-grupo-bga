import { buildMarcadoresHtml } from "./exportHtml";

// El resumen de marcadores existe para comparar meses: si las cuentas cambian, la evolucion miente.
describe("buildMarcadoresHtml", () => {
  const base = {
    companyLabel: "De raiz s.r.l",
    monthKey: "2026-07",
    percentages: {
      markupPct: 30,
      deviationPct: 5,
      laborDeviationPct: 0,
      vatPct: 21,
      commissionPct: 3,
      stockIncreasePct: 0,
      allocationMode: "auto",
      manualAllocationPct: 18.75,
    },
    fixedMarkers: [
      { group: "Alquiler", amount: 1000, active: true },
      { group: "Alquiler", amount: 500, active: true },
      { group: "Servicios", amount: 300, active: true },
      { group: "Servicios", amount: 999, active: false }, // inactivo: no suma
    ],
    supplyMarkers: [{ qty: 2, unitPrice: 50, active: true }],
    laborMarkers: [{ employees: 2, monthlyHoursPerEmployee: 100, hourlyRate: 10, active: true }],
    personalProvisionMarkers: [
      { amountPerDelivery: 1200, periodicityMonths: 6, active: true }, // 200/mes
      { amountPerDelivery: 500, periodicityMonths: 0, active: true }, // sin periodicidad: no prorratea
    ],
  };

  it("suma solo los marcadores activos y agrupa los costos fijos", () => {
    const html = buildMarcadoresHtml(base);
    expect(html).toContain("Alquiler");
    // 1000 + 500 + 300 = 1800 (el de 999 esta inactivo)
    expect(html).toMatch(/1\.800/);
    expect(html).not.toMatch(/2\.799/);
  });

  it("la mano de obra mensual es empleados x horas x valor hora", () => {
    // 2 x 100 x 10 = 2000
    expect(buildMarcadoresHtml(base)).toMatch(/2\.000/);
  });

  it("las provisiones se prorratean por su periodicidad y no dividen por cero", () => {
    const html = buildMarcadoresHtml(base);
    expect(html).toMatch(/\$\s?200/); // 1200 / 6 meses
    expect(html).not.toMatch(/Infinity|NaN/);
  });

  it("no explota sin marcadores cargados", () => {
    const html = buildMarcadoresHtml({
      ...base,
      fixedMarkers: [],
      supplyMarkers: [],
      laborMarkers: [],
      personalProvisionMarkers: [],
    });
    expect(html).toContain("Sin costos fijos activos");
    expect(html).not.toMatch(/NaN/);
  });
});
