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

function montar(onSetPagado = jest.fn(), onIrAlOrigen = jest.fn()) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => {
    root.render(
      <PagosInamovibles
        items={items}
        hoy={HOY}
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

const filaDe = (div: HTMLElement, texto: string) =>
  Array.from(div.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes(texto)) as HTMLElement;

const clickDerecho = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
  });

const botonDelMenu = (texto: string) =>
  Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

describe("PagosInamovibles", () => {
  it("lista el vencimiento con su cuenta regresiva y la cuota de deuda del mes", () => {
    const { div, root } = montar();
    expect(div.textContent).toContain("VEP IVA");
    expect(div.textContent).toContain("Faltan 4 días"); // limite 12/10
    expect(div.textContent).toContain("Echeq enchapadora");
    act(() => root.unmount());
    div.remove();
  });

  it("click derecho -> Marcar como pagado llama al handler con ese pago", () => {
    const onSetPagado = jest.fn();
    const { div, root } = montar(onSetPagado);
    clickDerecho(filaDe(div, "VEP IVA"));
    act(() => botonDelMenu("Marcar como pagado").click());
    expect(onSetPagado).toHaveBeenCalledWith(expect.objectContaining({ titulo: "VEP IVA" }), true);
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
