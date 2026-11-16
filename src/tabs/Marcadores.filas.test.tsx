import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MarcadoresTab } from "./Marcadores";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 16/11/2026: en Marcadores las filas de los cuatro bloques SOLO MUESTRAN. Ya tenían ficha
// (el botón 📋) pero la fila seguía siendo un muro de 14 campos editables: dos lugares para el mismo dato.
// Este test falla si alguien vuelve a poner un campo editable en una fila.
const base = { company: "BGA", workType: "Mueble", active: true, notes: "" };
const fijo = { ...base, id: 1, group: "Alquiler", description: "Galpón", amount: 1200000 };
const insumo = { ...base, id: 2, description: "Tornillos", qty: 10, unit: "u", unitPrice: 500, subtype: "Insumos basicos" };
const mano = { ...base, id: 3, category: "Armador", employees: 2, monthlyHoursPerEmployee: 176, hourlyRate: 4500, hoursBase: 100 };
const provision = { ...base, id: 4, description: "Ropa de trabajo", amountPerDelivery: 90000, periodicityMonths: 6, kind: "Ropa", shared: false };

const props = (extra: any = {}): any => ({
  tiposTrabajo: ["Mueble"],
  markupPct: 0,
  deviationPct: 0,
  laborDeviationPct: 0,
  vatPct: 21,
  commissionPct: 0,
  stockIncreasePct: 0,
  manualAllocationPct: 0,
  allocationMode: "auto",
  activeFixedMarkersForBudget: [],
  activeSupplyMarkersForBudget: [],
  activeLaborMarkersForBudget: [],
  activePersonalProvisionMonthlyTotal: 0,
  budget: { company: "BGA" },
  fixedMarkersByGroup: [],
  fixedMarkers: [fijo],
  supplyMarkers: [insumo],
  laborMarkers: [mano],
  personalProvisionMarkers: [provision],
  fixedMarkerGroupOptions: ["Alquiler", "Servicios"],
  costosEmpresariales: [],
  mesesDelPromedio: [],
  empresaDelPresupuesto: "BGA",
  COMPANY_OPTIONS: [{ value: "BGA", short: "BGA", label: "BGA", primary: "#14213d", soft: "#dbe7f7" }],
  getCompanyMeta: () => ({ short: "BGA", primary: "#14213d", soft: "#dbe7f7" }),
  promptAndCreateCostAnalysisGroup: () => null,
  updateArrayItem: () => {},
  setMarkupPct: () => {},
  setDeviationPct: () => {},
  setLaborDeviationPct: () => {},
  setVatPct: () => {},
  setCommissionPct: () => {},
  setStockIncreasePct: () => {},
  setManualAllocationPct: () => {},
  setAllocationMode: () => {},
  setFixedMarkers: () => {},
  setSupplyMarkers: () => {},
  setLaborMarkers: () => {},
  setPersonalProvisionMarkers: () => {},
  applyMarkersToBudget: () => {},
  addFixedMarker: () => {},
  removeFixedMarker: () => {},
  addSupplyMarker: () => {},
  removeSupplyMarker: () => {},
  syncLaborMarkersFromPersonal: () => {},
  addLaborMarker: () => {},
  removeLaborMarker: () => {},
  restorePersonalProvisionMarkersFromStock: () => {},
  addPersonalProvisionMarker: () => {},
  removePersonalProvisionMarker: () => {},
  ...extra,
});

const render = (extra: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(<MarcadoresTab {...props(extra)} />));
  return { div, root };
};

const filasDeMarcadores = (div: HTMLElement) =>
  Array.from(div.querySelectorAll("tr")).filter((tr) => (tr.getAttribute("title") || "").startsWith("Click: abrir la ficha del marcador"));

describe("Marcadores: las filas solo muestran", () => {
  it("los cuatro bloques tienen su fila y ninguna tiene campos editables", () => {
    const { div, root } = render();
    const filas = filasDeMarcadores(div);
    expect(filas).toHaveLength(4);
    filas.forEach((tr) => expect(Array.from(tr.querySelectorAll("input, select, textarea"))).toEqual([]));
    act(() => root.unmount());
  });

  it("los datos se siguen leyendo en la fila", () => {
    const { div, root } = render();
    const t = filasDeMarcadores(div)
      .map((tr) => tr.textContent || "")
      .join(" | ");
    expect(t).toContain("Galpón");
    expect(t).toContain("Alquiler");
    expect(t).toContain("Tornillos");
    expect(t).toContain("Insumos basicos");
    expect(t).toContain("Armador");
    expect(t).toContain("hs base");
    expect(t).toContain("Ropa de trabajo");
    expect(t).toContain("Ropa");
    act(() => root.unmount());
  });

  it("el costo fijo que lo pone el promedio de 3 meses lo dice", () => {
    const { div, root } = render({ fixedMarkers: [{ ...fijo, sigueSugerido: true }] });
    expect(div.textContent).toContain("lo pone el promedio de 3 meses");
    act(() => root.unmount());
  });

  it("el punto verde sigue activando y desactivando desde la fila", () => {
    const tocado: any[] = [];
    const { div, root } = render({
      updateArrayItem: (_s: any, id: number, campo: string, valor: any) => {
        tocado.push([id, campo, valor]);
      },
    });
    const punto = filasDeMarcadores(div)[0].querySelector('span[title^="Activo"]')!;
    act(() => {
      punto.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(tocado).toEqual([[1, "active", false]]);
    act(() => root.unmount());
  });

  it("el click en la fila abre la ficha, con los campos que antes estaban solo en la fila", () => {
    const { div, root } = render();
    const filaInsumo = filasDeMarcadores(div).find((tr) => (tr.textContent || "").includes("Tornillos"))!;
    act(() => {
      filaInsumo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const texto = document.body.textContent || "";
    expect(texto).toContain("Tipo de insumo");
    act(() => root.unmount());
  });
});
