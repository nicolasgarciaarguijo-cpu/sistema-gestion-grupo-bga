import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { AlertasInamovibles } from "./AlertasInamovibles";
import { agendaInamovibles, alertasActivas, type FuentesInamovibles } from "../domain/agendaInamovibles";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// La franja del encabezado avisa el resumen de tarjeta que esta por vencer con renglones sin linkear, y el
// aviso abre la ficha de ESE resumen (no el Calendario).
const fuentes = (sinLinkear: number): FuentesInamovibles => ({
  vencimientos: [],
  marcas: [],
  debtPlans: [],
  tarjetas: [{ id: 3, company: "De Raíz", dueDate: "2026-10-11", totalArs: 800000, totalUsd: 0, paid: false, nombre: "Visa", sinLinkear }],
  pagosCashflow: [],
  seguros: [],
  sueldos: [],
  real: new Map(),
});
const items = (sinLinkear: number) => alertasActivas(agendaInamovibles(fuentes(sinLinkear), "2026-10-01", "2026-12-31", "2026-10-08"));

const pintar = (sinLinkear: number, onOpen: () => void, onConciliar: (i: any) => void) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() => createRoot(div).render(<AlertasInamovibles items={items(sinLinkear)} companyShort={(c) => c} onOpen={onOpen} onConciliar={onConciliar} />));
  return div;
};

describe("AlertasInamovibles · conciliar el resumen antes de pagarlo", () => {
  it("muestra cuantos renglones faltan y abre la ficha del resumen sin ir al Calendario", () => {
    const onOpen = jest.fn();
    const onConciliar = jest.fn();
    const div = pintar(12, onOpen, onConciliar);
    const boton = div.querySelector("button") as HTMLButtonElement;
    expect(boton.textContent).toContain("12 renglones sin linkear");
    act(() => boton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onConciliar).toHaveBeenCalledTimes(1);
    expect(onConciliar.mock.calls[0][0].refId).toBe(3);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("con todo linkeado no aparece el aviso de conciliar", () => {
    const div = pintar(0, () => {}, () => {});
    expect(div.querySelector("button")).toBeNull();
    expect(div.textContent).not.toContain("sin linkear");
    expect(div.textContent).toContain("Tarjeta Visa");
  });
});
