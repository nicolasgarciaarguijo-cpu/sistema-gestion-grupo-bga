// El bloque de pagos inamovibles: que muestre lo que suena, que el click derecho ofrezca marcar pagado
// (y que eso llegue al handler con el pago correcto), y que lo de otra solapa ofrezca ir a su origen.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { PagosInamovibles } from "./PagosInamovibles";
import { agendaInamovibles } from "../domain/agendaInamovibles";

const HOY = "2026-10-08";
const items = agendaInamovibles(
  {
    vencimientos: [
      { id: 1, company: "BGA", titulo: "VEP IVA", tipo: "impuesto", monto: 250000, administration: "blanco", conceptKey: "imp_iva_mensual", recurrencia: "mensual", diaDesde: 8, diaHasta: 12, avisoDias: 5, activo: true, notas: "" },
    ],
    marcas: [],
    debtPlans: [{ id: 7, company: "BGA", concept: "Echeq enchapadora", nextInstallmentAmount: 500000, remainingInstallments: 2, nextDueDate: "2026-10-20", active: true }],
    tarjetas: [],
    pagosCashflow: [],
    seguros: [],
    sueldos: [],
    real: new Map(),
  },
  "2026-07-01",
  "2027-06-30",
  HOY
);

function montar(onSetPagado = jest.fn(), onIrAlOrigen = jest.fn(), hoy = HOY, lista = items) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => {
    root.render(
      <PagosInamovibles
        items={lista}
        hoy={hoy}
        vencimientos={[]}
        companyOptions={[{ value: "BGA", short: "BGA", primary: "#14213d" }]}
        sections={[]}
        canEdit
        onSetPagado={onSetPagado}
        onConfirmarFecha={jest.fn()}
        onMontoOcurrencia={jest.fn()}
        onSaveVencimiento={jest.fn()}
        onDeleteVencimiento={jest.fn()}
        onIrAlOrigen={onIrAlOrigen}
      />
    );
  });
  return { div, root };
}

// La fila de la lista de vencidos o, si no esta vencido, su marca en el almanaque.
const filaDe = (div: HTMLElement, texto: string) =>
  (Array.from(div.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes(texto)) ||
    Array.from(div.querySelectorAll("div[title]")).find((d) => d.getAttribute("title")?.startsWith(texto))) as HTMLElement;

const clickDerecho = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
  });

const botonDelMenu = (texto: string) =>
  Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

describe("PagosInamovibles", () => {
  it("el almanaque muestra lo del mes; la lista, solo lo vencido; sin vencidos no hay lista", () => {
    const { div, root } = montar();
    expect(div.textContent).toContain("VEP IVA");
    expect(div.textContent).toContain("Echeq enchapadora"); // en el almanaque
    const filas = Array.from(div.querySelectorAll("tbody tr")).map((tr) => tr.textContent || "");
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((t) => t.includes("Vencido"))).toBe(true);
    expect(filas.some((t) => t.includes("Echeq"))).toBe(false);
    act(() => root.unmount());
    div.remove();
    const vacio = montar(jest.fn(), jest.fn(), HOY, items.filter((i) => i.estado !== "vencido"));
    expect(vacio.div.querySelector("table")).toBeNull();
    expect(vacio.div.textContent).toContain("No hay pagos vencidos sin pagar");
    act(() => vacio.root.unmount());
    vacio.div.remove();
  });

  // Nicolas, 2026-10-20: la lista es solo para ver lo que se tendria que haber pagado.
  it("la lista muestra solo lo vencido sin pagar", () => {
    const hoy = "2026-10-15";
    const vencidos = agendaInamovibles(
      {
        vencimientos: [
          { id: 1, company: "BGA", titulo: "VEP IVA", tipo: "impuesto", monto: 250000, administration: "blanco", conceptKey: "imp_iva_mensual", recurrencia: "mensual", diaDesde: 8, diaHasta: 12, avisoDias: 5, activo: true, notas: "" },
        ],
        marcas: [],
        debtPlans: [{ id: 7, company: "BGA", concept: "Echeq enchapadora", nextInstallmentAmount: 500000, remainingInstallments: 2, nextDueDate: "2026-10-20", active: true }],
        tarjetas: [],
        pagosCashflow: [],
        seguros: [],
        sueldos: [],
        real: new Map(),
      },
      "2026-07-01",
      "2027-06-30",
      hoy
    );
    const { div, root } = montar(jest.fn(), jest.fn(), hoy, vencidos);
    const filas = Array.from(div.querySelectorAll("tbody tr")).map((tr) => tr.textContent || "");
    expect(filas.some((t) => t.includes("VEP IVA") && t.includes("Vencido"))).toBe(true);
    expect(filas.some((t) => t.includes("Echeq enchapadora"))).toBe(false);
    act(() => root.unmount());
    div.remove();
  });

  // SOLO PARA VER (Nicolas, 2026-10-17): el pago se marca donde se paga, no aca. Tampoco hay "+ Vencimiento".
  it("click derecho ya no ofrece marcar pagado ni editar; no hay '+ Vencimiento'", () => {
    const onSetPagado = jest.fn();
    const { div, root } = montar(onSetPagado);
    expect(botonDelMenu("+ Vencimiento")).toBeUndefined();
    clickDerecho(filaDe(div, "VEP IVA"));
    expect(botonDelMenu("Marcar como pagado")).toBeUndefined();
    expect(botonDelMenu("Editar el vencimiento")).toBeUndefined();
    expect(botonDelMenu("Confirmar la fecha")).toBeUndefined();
    expect(onSetPagado).not.toHaveBeenCalled();
    act(() => root.unmount());
    div.remove();
  });

  it("lo que viene de otra solapa ofrece ir a donde se carga", () => {
    const onIr = jest.fn();
    const { div, root } = montar(jest.fn(), onIr);
    clickDerecho(filaDe(div, "Echeq enchapadora"));
    act(() => botonDelMenu("Ir a donde se carga").click());
    expect(onIr).toHaveBeenCalledWith(expect.objectContaining({ origen: "deuda" }));
    act(() => root.unmount());
    div.remove();
  });
});
