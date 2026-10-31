// Estructura del Calendario: no deja ocultar lo que tiene plata; ocultar lo vacío y ordenar guardan.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { EstructuraCalendario } from "./EstructuraCalendario";
import { DEFAULT_CALENDAR_ROW_CONFIG } from "../domain/calendarStructure";

describe("EstructuraCalendario", () => {
  it("ocultar: no con movimientos; sí sin movimientos", () => {
    const cambiar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() => root.render(<EstructuraCalendario config={DEFAULT_CALENDAR_ROW_CONFIG} onCambiar={cambiar} movimientos={{ prestamos: 3 }} />));
    const filaDe = (key: string) => Array.from(div.querySelectorAll("tr")).find((tr) => (tr.querySelector("input") as HTMLInputElement | null)?.placeholder === key)!;
    const prest = filaDe("MOVIMIENTOS INTERNOS · INGRESO");
    act(() => Array.from(prest.querySelectorAll("button")).find((b) => b.textContent === "Ocultar")!.click());
    expect(div.textContent).toContain("tiene 3 movimientos");
    expect(cambiar).not.toHaveBeenCalled();
    const inv = filaDe("INVERSIONES");
    act(() => Array.from(inv.querySelectorAll("button")).find((b) => b.textContent === "Ocultar")!.click());
    expect(cambiar.mock.calls[0][0].hiddenSections).toEqual(["inversiones"]);
    act(() => Array.from(inv.querySelectorAll("button")).find((b) => b.textContent === "↑")!.click());
    expect(cambiar.mock.calls[1][0].sectionOrder.indexOf("inversiones")).toBeLessThan(cambiar.mock.calls[1][0].sectionOrder.indexOf("prestamos"));
    act(() => root.unmount());
  });
});
