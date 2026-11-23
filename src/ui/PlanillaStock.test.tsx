import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { VentanaPlanillaStock } from "./PlanillaStock";
import type { ComparacionPlanilla } from "../domain/planillaStock";

// Leer la planilla NO cambia nada: muestra lo que cambiaria y se aplica lo tildado. Las bajas no vienen tildadas.
const cambio = (id: number, codigo: string, antes: number, despues: number, extra: any = {}) => ({
  id, codigo, descripcion: `Artículo ${codigo}`, descripcionPlanilla: `Artículo ${codigo}`, hoja: "Melaminas", antes, despues,
  pct: Math.round(((despues - antes) / antes) * 1000) / 10, descripcionDistinta: false, ...extra,
});
const comparacion: ComparacionPlanilla = {
  suben: [cambio(1, "MEL-001", 100, 110), cambio(2, "MEL-002", 100, 500, { descripcionDistinta: true, descripcionPlanilla: "Tornillo" })],
  bajan: [cambio(3, "HIE-001", 100, 90)],
  iguales: 40,
  noAplicables: [{ codigo: "NUE-001", descripcion: "Nuevo", hoja: "Varios", motivo: "no está en el stock del sistema" }],
  faltanEnPlanilla: 7,
};
const pintar = (c: ComparacionPlanilla, onAplicar = jest.fn(), hojas = ["Melaminas"]) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() => createRoot(div).render(<VentanaPlanillaStock nombre="Planilla_costos.xlsx" comparacion={c} hojasLeidas={hojas} onAplicar={onAplicar} onCerrar={() => {}} />));
  return { div, onAplicar };
};
const tilde = (div: HTMLElement, codigo: string) => div.querySelector(`[data-cambio-precio="${codigo}"] input`) as HTMLInputElement;

describe("ventana de la planilla de precios", () => {
  it("resume lo leido y aclara que todavia no se cambio nada", () => {
    const { div } = pintar(comparacion);
    const t = div.querySelector("[data-resumen-planilla]")!.textContent || "";
    expect(t).toContain("2 suben · 1 bajan · 40 quedan igual");
    expect(t).toContain("Todavía no se cambió nada");
    expect(t).toContain("7 artículos del sistema no figuran en la planilla");
  });

  it("vienen tildadas solo las subas seguras; ni la baja ni la de descripcion distinta", () => {
    const { div } = pintar(comparacion);
    expect(tilde(div, "MEL-001").checked).toBe(true);
    expect(tilde(div, "MEL-002").checked).toBe(false);
    expect(tilde(div, "HIE-001").checked).toBe(false);
    expect(div.textContent).toContain("en la planilla este código dice «Tornillo»");
    expect(div.querySelector("[data-aplicar-planilla]")!.textContent).toBe("Actualizar 1 precio");
  });

  it("aplica solo lo tildado, y avisa si se va a bajar un precio", () => {
    const { div, onAplicar } = pintar(comparacion);
    act(() => tilde(div, "HIE-001").click());
    expect(div.textContent).toContain("Vas a bajar 1 precio.");
    act(() => (div.querySelector("[data-aplicar-planilla]") as HTMLButtonElement).click());
    expect(onAplicar).toHaveBeenCalledWith([{ id: 1, despues: 110 }, { id: 3, despues: 90 }]);
  });

  it("sin diferencias dice venimos bien y no ofrece actualizar", () => {
    const { div } = pintar({ suben: [], bajan: [], iguales: 40, noAplicables: [], faltanEnPlanilla: 0 });
    expect(div.querySelector("[data-resumen-planilla]")!.textContent).toContain("Venimos bien");
    expect(div.querySelector("[data-aplicar-planilla]")).toBeNull();
  });

  it("una planilla que no es la de costos lo dice", () => {
    const { div } = pintar({ suben: [], bajan: [], iguales: 0, noAplicables: [], faltanEnPlanilla: 9 }, jest.fn(), []);
    expect(div.querySelector("[data-resumen-planilla]")!.textContent).toContain("No encontré ninguna hoja");
  });
});

// 23/11/2026: las referencias de "mas barato" se anotan con su propio boton y no son precios.
describe("referencias de mas barato en la ventana", () => {
  const refs = [{ id: 1, masBarato: 900, proveedor: "All Sur (-10 %)" }];
  it("se anotan aparte, aunque no haya ningun precio para actualizar", () => {
    const onReferencias = jest.fn();
    const onAplicar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const c: ComparacionPlanilla = { suben: [], bajan: [], iguales: 40, noAplicables: [], faltanEnPlanilla: 0, referencias: refs };
    act(() => createRoot(div).render(<VentanaPlanillaStock nombre="P.xlsx" comparacion={c} hojasLeidas={["Herrajes"]} onAplicar={onAplicar} onReferencias={onReferencias} onCerrar={() => {}} />));
    expect(div.querySelector("[data-referencias-planilla]")!.textContent).toContain("no cambian el precio con que se cotiza");
    act(() => (div.querySelector("[data-anotar-referencias]") as HTMLButtonElement).click());
    expect(onReferencias).toHaveBeenCalledWith(refs);
    expect(onAplicar).not.toHaveBeenCalled();
    expect(div.querySelector("[data-referencias-planilla]")!.textContent).toContain("1 anotada");
    expect(div.querySelector("[data-anotar-referencias]")).toBeNull();
  });
  it("sin referencias no aparece el bloque", () => {
    const { div } = pintar(comparacion);
    expect(div.querySelector("[data-referencias-planilla]")).toBeNull();
  });
});
