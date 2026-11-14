import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MovimientosInternosTab } from "./MovimientosInternos";
import { valoresDeEmitida, type FacturaEmitidaRef } from "../domain/facturaEmitida";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 14/11/2026: "podría también haber facturas entre empresas sin trabajos de por medio solo para
// acomodar los movimientos internos. por lo tanto en movimientos internos debería también estar una ficha
// de facturas. (...) hay que asegurarse de que no haya facturas emitidas duplicadas".
const factura = {
  id: 90,
  company: "BGA",
  kind: "1 - Factura A",
  pointOfSale: "1",
  number: "501",
  date: "2026-11-12",
  counterpartyName: "DR",
  counterpartyTaxId: "30717695409",
  currency: "ARS",
  net: 1000000,
  vatRate: 21,
  vat: 210000,
  total: 1210000,
};

const props = (extra: any = {}, refs: FacturaEmitidaRef[] = []): any => ({
  companyScope: "__ALL__",
  setCompanyScope: () => {},
  COMPANY_OPTIONS: [{ value: "BGA", short: "BGA", label: "BGA" }, { value: "DR", short: "DR", label: "De Raíz" }],
  getCompanyMeta: (c: string) => ({ short: c === "DR" ? "DR" : "BGA" }),
  updateArrayItem: () => {},
  internalTransfers: [],
  setInternalTransfers: () => {},
  onGuardarPase: () => {},
  cuentas: [{ id: "banco|BGA|santander|ARS", company: "BGA", tipo: "banco", nombre: "Santander", moneda: "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "2026-01-01", activa: true }],
  removeInternalTransfer: () => {},
  cashHoldings: [],
  setCashHoldings: () => {},
  addCashHolding: () => {},
  removeCashHolding: () => {},
  capitalEntries: [],
  setCapitalEntries: () => {},
  addCapitalEntry: () => {},
  removeCapitalEntry: () => {},
  calendarLoans: [],
  personLedger: { accounts: [], total: 0, aFavorTotal: 0 },
  personLedgerEntries: [],
  setPersonLedgerEntries: () => {},
  addPersonLedgerEntry: () => {},
  removePersonLedgerEntry: () => {},
  intercompanyAccount: { transfers: [], summary: { totalTransferred: 0, pairs: [] }, posicion: [] },
  money: (n: number) => `$${n}`,
  onAbrirDeuda: () => {},
  onMigrarADesendeudamiento: () => {},
  deudas: [],
  facturasEntreEmpresas: [{ ...factura, ...extra }],
  refsFacturasEmitidas: refs,
  addFacturaEntreEmpresas: () => {},
  removeFacturaEntreEmpresas: () => {},
  updateFacturaEntreEmpresas: () => {},
});

const render = (extra: any = {}, refs: FacturaEmitidaRef[] = []) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() => root.render(<MovimientosInternosTab {...props(extra, refs)} />));
  return { div, root };
};

const filaFactura = (div: HTMLElement) =>
  Array.from(div.querySelectorAll("tbody tr")).find((tr) => (tr.textContent || "").includes("Factura A"));

describe("Facturas entre las empresas, en Movimientos internos", () => {
  it("la factura entre empresas se ve en su bloque y la fila solo muestra", () => {
    const { div, root } = render();
    expect(div.textContent).toContain("Facturas entre las empresas del grupo");
    const fila = filaFactura(div)!;
    expect(fila).toBeTruthy();
    expect(fila.textContent).toContain("1-501");
    expect(fila.textContent).toContain("12/11/2026");
    expect(Array.from(fila.querySelectorAll("input, select, textarea"))).toEqual([]);
    expect(fila.getAttribute("title")).toContain("Click: abrir la ficha");
    act(() => root.unmount());
  });

  it("avisa lo que falta para cruzarla con el listado de ARCA", () => {
    const { div, root } = render({ pointOfSale: "", number: "" });
    expect(filaFactura(div)!.textContent).toContain("falta el punto de venta");
    act(() => root.unmount());
  });

  it("si el mismo comprobante ya está en un trabajo, la fila lo marca", () => {
    const refs: FacturaEmitidaRef[] = [
      { ...valoresDeEmitida(factura), id: 7, origen: "trabajo", donde: "el trabajo P-3162" },
      { ...valoresDeEmitida(factura), id: 90, origen: "entreEmpresas", donde: "las facturas entre empresas" },
    ];
    const { div, root } = render({}, refs);
    expect(filaFactura(div)!.textContent).toContain("ya está cargado en el trabajo P-3162");
    act(() => root.unmount());
  });

  it("sin facturas entre empresas lo dice y no inventa filas", () => {
    const div = document.createElement("div");
    const root = createRoot(div);
    act(() => root.render(<MovimientosInternosTab {...props()} facturasEntreEmpresas={[]} />));
    expect(div.textContent).toContain("Lo normal es que la factura vaya en su trabajo aprobado");
    expect(filaFactura(div)).toBeUndefined();
    act(() => root.unmount());
  });
});
