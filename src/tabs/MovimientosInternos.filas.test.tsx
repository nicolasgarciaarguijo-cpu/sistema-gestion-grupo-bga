import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MovimientosInternosTab } from "./MovimientosInternos";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 14/11/2026: en Movimientos internos las filas SOLO MUESTRAN. Nada se tipea en la fila: se
// abre la ficha (click en la fila o el botón de la ficha) y ahí se corrige todo. Antes cada celda era
// un input y se pisaba cualquier dato sin querer; además la pantalla era un muro de cajitas.
const EMPRESA = "BGA";

const props = (): any => ({
  companyScope: "__ALL__",
  setCompanyScope: () => {},
  COMPANY_OPTIONS: [{ value: "BGA", short: "BGA", label: "BGA" }, { value: "DR", short: "DR", label: "De Raíz" }],
  getCompanyMeta: (c: string) => ({ short: c === "DR" ? "DR" : "BGA" }),
  updateArrayItem: () => {},
  internalTransfers: [
    { id: 1, company: EMPRESA, date: "2026-11-10", direction: "efectivo_a_banco", currency: "ARS", color: "blanco", amount: 500000, bank: "", description: "Depósito", notes: "la nota", cuentaId: "efectivo|BGA|blanco|ARS", cuentaDestinoId: "banco|BGA|santander|ARS" },
  ],
  setInternalTransfers: () => {},
  onGuardarPase: () => {},
  cuentas: [
    { id: "efectivo|BGA|blanco|ARS", company: EMPRESA, tipo: "efectivo", nombre: "Efectivo blanco", moneda: "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "2026-01-01", activa: true },
    { id: "banco|BGA|santander|ARS", company: EMPRESA, tipo: "banco", nombre: "Santander", moneda: "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "2026-01-01", activa: true },
  ],
  removeInternalTransfer: () => {},
  cashHoldings: [
    { id: 2, company: EMPRESA, date: "2026-11-11", description: "Caja de seguridad", currency: "ARS", color: "negro", kind: "ingreso", amount: 300000, notes: "", cuentaId: "efectivo|BGA|blanco|ARS" },
  ],
  setCashHoldings: () => {},
  addCashHolding: () => {},
  removeCashHolding: () => {},
  capitalEntries: [
    { id: 3, company: EMPRESA, date: "2026-11-12", origin: "Nicolás", kind: "aporte", direction: "recibido", color: "blanco", amount: 1000000, notes: "", usdValue: 700, cuentaId: "banco|BGA|santander|ARS" },
  ],
  setCapitalEntries: () => {},
  addCapitalEntry: () => {},
  removeCapitalEntry: () => {},
  calendarLoans: [],
  personLedger: {
    accounts: [
      {
        person: "Joaquín",
        debe: 50000,
        haber: 0,
        saldo: 50000,
        movements: [
          { key: "m1", entryId: 4, kind: "debe", date: "2026-11-13", description: "Puso plata", amount: 50000, company: EMPRESA, source: "manual" },
        ],
      },
    ],
    total: 50000,
    aFavorTotal: 0,
  },
  personLedgerEntries: [
    { id: 4, company: EMPRESA, person: "Joaquín", date: "2026-11-13", kind: "debe", amount: 50000, color: "blanco", description: "Puso plata", notes: "" },
  ],
  setPersonLedgerEntries: () => {},
  addPersonLedgerEntry: () => {},
  removePersonLedgerEntry: () => {},
  intercompanyAccount: { transfers: [], summary: { totalTransferred: 0, pairs: [] }, posicion: [] },
  money: (n: number) => `$${n}`,
  onAbrirDeuda: () => {},
  onMigrarADesendeudamiento: () => {},
  deudas: [],
});

const render = () => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() => root.render(<MovimientosInternosTab {...props()} />));
  return { div, root };
};

describe("Movimientos internos: las filas solo muestran", () => {
  it("no hay ni un input ni un select dentro de las filas de los cuatro bloques", () => {
    const { div, root } = render();
    const celdasEditables = Array.from(div.querySelectorAll("tbody input, tbody select, tbody textarea"));
    expect(celdasEditables).toEqual([]);
    act(() => root.unmount());
  });

  it("los datos se siguen viendo en la fila", () => {
    const { div, root } = render();
    const texto = div.textContent || "";
    expect(texto).toContain("Depósito");
    expect(texto).toContain("10/11/2026");
    expect(texto).toContain("Caja de seguridad");
    expect(texto).toContain("Nicolás");
    expect(texto).toContain("U$S 700");
    expect(texto).toContain("Joaquín");
    act(() => root.unmount());
  });

  it("cada fila invita a abrir la ficha", () => {
    const { div, root } = render();
    const filas = Array.from(div.querySelectorAll("tbody tr"));
    expect(filas.length).toBeGreaterThan(0);
    const conFicha = filas.filter((tr) => (tr.getAttribute("title") || "").startsWith("Click: abrir la ficha"));
    expect(conFicha.length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});
