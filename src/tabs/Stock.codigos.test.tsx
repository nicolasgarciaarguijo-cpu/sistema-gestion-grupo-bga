import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { StockTab } from "./Stock";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 16/11/2026: el material del presupuesto cruza con el stock POR CÓDIGO, así que dos artículos
// con el mismo código hacen que el presupuesto mire el equivocado. Pasó de verdad: ALU-001 quedó en
// "Zócalo fleje Aluminio 100mm" y en "perfilería aluminio portaled". La fila ahora lo avisa.
const art = (id: number, code: string, description: string, extra: any = {}) => ({
  id,
  company: "BGA",
  kind: "general",
  shared: false,
  group: "Aluminio",
  location: "Taller",
  sortOrder: id,
  code,
  description,
  unit: "u",
  quantity: 5,
  unitPrice: 1000,
  periodicityMonths: 0,
  active: true,
  ...extra,
});

const render = (items: any[]) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <StockTab
        {...({
          stockSemaphoreSummary: { verde: 0, amarillo: 0, rojo: 0 },
          approvedJobsSummary: [],
          stockByCode: new Map(),
          stockByDescription: new Map(),
          fixedMarkerGroupOptions: [],
          visibleStockItems: items,
          stockIncreasePct: 0,
          totalStockValue: 0,
          costAnalysisGroups: [],
          costAnalysisEntries: [],
          remitoDrafts: [],
          stockPersonalItems: [],
          personalProvisionAlerts: [],
          visibleCompanyAssets: [],
          activeAssetsMonthlyDepreciation: 0,
          stockNeedRows: [],
          STOCK_GENERAL_GROUP_OPTIONS: ["Aluminio", "Melaminas"],
          COMPANY_OPTIONS: [{ value: "BGA", short: "BGA", label: "BGA", primary: "#14213d" }],
          getCompanyMeta: () => ({ short: "BGA", primary: "#14213d" }),
          getCompanyScopeLabel: (c: any) => String(c),
          setStockIncreasePct: () => {},
          setCompanyAssets: () => {},
          updateArrayItem: () => {},
          exportPrint: () => {},
          updateApprovedJob: () => {},
          applyStockIncrease: () => {},
          addStockItem: () => {},
          registerStockMovement: () => {},
          updateStockItem: () => {},
          removeStockItem: () => {},
          addCostAnalysisGroup: () => {},
          addCostAnalysisEntry: () => {},
          updateCostAnalysisGroup: () => {},
          removeCostAnalysisGroup: () => {},
          updateCostAnalysisEntry: () => {},
          removeCostAnalysisEntry: () => {},
          handleRemitoFiles: () => {},
          updateRemitoDraft: () => {},
          updateRemitoDraftRow: () => {},
          removeRemitoDraftRow: () => {},
          addRemitoDraftRow: () => {},
          commitRemitoDraftToStock: () => {},
          removeRemitoDraft: () => {},
          addPersonalStockItem: () => {},
          restorePersonalProvisionMarkersFromStock: () => {},
          addCompanyAsset: () => {},
          removeCompanyAsset: () => {},
          money: (n: number) => "$" + n,
        } as any)}
      />
    )
  );
  return { div, root };
};

const filaDe = (div: HTMLElement, texto: string) =>
  Array.from(div.querySelectorAll("tr")).find((tr) => (tr.textContent || "").includes(texto));

describe("Stock: el código repetido se avisa", () => {
  it("dos artículos con el mismo código quedan marcados", () => {
    const { div, root } = render([
      art(1, "ALU-001", "Zócalo fleje Aluminio 100mm"),
      art(2, "ALU-001", "perfilería aluminio portaled"),
      art(3, "ALU-002", "otro perfil"),
    ]);
    expect(filaDe(div, "Zócalo fleje")!.textContent).toContain("código repetido");
    expect(filaDe(div, "perfilería")!.textContent).toContain("código repetido");
    expect(filaDe(div, "otro perfil")!.textContent).not.toContain("código repetido");
    act(() => root.unmount());
  });

  it("si al artículo le falta un dato, la fila lo dice", () => {
    const { div, root } = render([art(1, "", "Perfil sin código", { unit: "" })]);
    const t = filaDe(div, "Perfil sin código")!.textContent || "";
    expect(t).toContain("falta el código");
    expect(t).toContain("la unidad");
    act(() => root.unmount());
  });

  it("sin repetidos no aparece ningún aviso", () => {
    const { div, root } = render([art(1, "ALU-001", "Perfil uno"), art(2, "ALU-002", "Perfil dos")]);
    expect(div.textContent).not.toContain("código repetido");
    act(() => root.unmount());
  });
});
