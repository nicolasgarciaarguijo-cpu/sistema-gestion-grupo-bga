import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { InversionesTab } from "./Inversiones";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 14/11/2026: la fila solo MUESTRA y todo se corrige en la ficha (una sola ficha por vínculo,
// y la pantalla más limpia). Este test falla si alguien vuelve a poner un campo editable en la fila.
const inversion = {
  id: 1,
  company: "BGA",
  tipo: "Plazo fijo",
  descripcion: "Santander 30 días",
  moneda: "ARS",
  montoInvertido: 1000000,
  valorActual: 1080000,
  fechaInicio: "2026-10-15",
  fechaFin: "2026-11-15",
  estado: "activa",
  administration: "blanco",
  cuentaId: "banco|BGA|santander|ARS",
  notas: "",
};

const render = (extra: any = {}) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <InversionesTab
        inversiones={[{ ...inversion, ...extra }] as any}
        companyScope="__ALL__"
        COMPANY_OPTIONS={[{ value: "BGA", short: "BGA", label: "BGA" }]}
        getCompanyMeta={() => ({ short: "BGA" })}
        onScopeChange={() => {}}
        addInversion={() => {}}
        removeInversion={() => {}}
        updateInversion={() => {}}
        cuentas={[{ id: "banco|BGA|santander|ARS", company: "BGA", nombre: "Santander", moneda: "ARS", activa: true }]}
      />
    )
  );
  return { div, root };
};

describe("Inversiones: la fila solo muestra", () => {
  it("no hay campos editables dentro de las filas", () => {
    const { div, root } = render();
    expect(Array.from(div.querySelectorAll("tbody input, tbody select, tbody textarea"))).toEqual([]);
    act(() => root.unmount());
  });

  it("los datos se siguen leyendo en la fila", () => {
    const { div, root } = render();
    const t = div.textContent || "";
    expect(t).toContain("Plazo fijo");
    expect(t).toContain("Santander 30 días");
    expect(t).toContain("15/10/2026");
    expect(t).toContain("Activa");
    act(() => root.unmount());
  });

  it("si falta la cuenta lo avisa en la fila", () => {
    const { div, root } = render({ cuentaId: undefined });
    expect(div.textContent).toContain("falta la cuenta");
    act(() => root.unmount());
  });

  it("la fila invita a abrir la ficha", () => {
    const { div, root } = render();
    const fila = div.querySelector("tbody tr");
    expect(fila?.getAttribute("title")).toContain("Click: abrir la ficha");
    act(() => root.unmount());
  });
});
