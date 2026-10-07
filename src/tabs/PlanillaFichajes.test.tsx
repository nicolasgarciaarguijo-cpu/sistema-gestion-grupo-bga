// La planilla de fichajes y la ficha del empleado son el MISMO dato: corregir una hora aca tiene que
// llamar al mismo handler que el Presentismo de la ficha (updateAttendanceRecord).
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { PlanillaFichajes } from "./PlanillaFichajes";

const empleado: any = {
  id: 7,
  company: "De raiz s.r.l",
  legajo: "6",
  name: "ADALBERTO SORIA",
  attendance: [
    { date: "2026-10-05", status: "presente", checkIn: "07:28", checkOut: "17:05", normalHours: 9, extra50Hours: 0, extra100Hours: 0, attachmentName: "", notes: "", fichadas: ["07:28", "12:10", "13:02", "17:05"] },
  ],
};

function montar(onUpdate = jest.fn()) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => {
    root.render(
      <PlanillaFichajes
        employees={[empleado]}
        month="2026-10"
        monthLabel="Octubre 2026"
        getCompanyMeta={() => ({ short: "De Raíz", primary: "#b7791f" })}
        onUpdateAttendance={onUpdate}
      />
    );
  });
  return { div, root };
}

describe("PlanillaFichajes", () => {
  it("muestra al empleado con sus horarios del mes", () => {
    const { div, root } = montar();
    expect(div.textContent).toContain("ADALBERTO SORIA");
    const inputs = Array.from(div.querySelectorAll('input[type="time"]')) as HTMLInputElement[];
    expect(inputs.some((i) => i.value === "07:28")).toBe(true);
    expect(inputs.some((i) => i.value === "17:05")).toBe(true);
    act(() => root.unmount());
    div.remove();
  });

  it("corregir la salida llama al mismo handler que la ficha", () => {
    const onUpdate = jest.fn();
    const { div, root } = montar(onUpdate);
    const salida = (Array.from(div.querySelectorAll('input[type="time"]')) as HTMLInputElement[]).find((i) => i.value === "17:05")!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(salida, "18:30");
      salida.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onUpdate).toHaveBeenCalledWith(7, "2026-10-05", "checkOut", "18:30");
    act(() => root.unmount());
    div.remove();
  });

  it("la pill del dia dice cuantas pasadas hubo y el dia se abre con click derecho", () => {
    const { div, root } = montar();
    const celda = Array.from(div.querySelectorAll("td")).find((td) => (td.getAttribute("title") || "").includes("Lun 05"))!;
    expect(celda.textContent).toContain("4"); // la pill
    act(() => {
      celda.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    });
    const ver = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Ver las 4 pasadas"))!;
    act(() => ver.click());
    expect(document.body.textContent).toContain("12:10");
    expect(document.body.textContent).toContain("pasada intermedia");
    act(() => root.unmount());
    div.remove();
  });
});
