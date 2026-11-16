import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { RetirosSocietariosPanel } from "./RetirosSocietarios";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 16/11/2026: el retiro societario mueve plata (monto, moneda, blanco/negro y de qué cuenta
// sale) y era la única solapa que lo tipeaba en la fila, sin ficha. Ahora la fila solo muestra y todo se
// corrige en la ficha. Este test falla si alguien vuelve a poner un campo editable en la fila.
const retiro = {
  id: 1,
  company: "BGA",
  fecha: "2026-11-10",
  socio: "Nicolás",
  monto: 2500000,
  moneda: "ARS" as const,
  administration: "blanco" as const,
  cuentaId: "banco|BGA|santander|ARS",
  motivo: "retiro mensual",
  origen: "manual" as const,
};

const render = (extra: any = {}, props: any = {}) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <RetirosSocietariosPanel
        retiros={[{ ...retiro, ...extra }] as any}
        desde="2026-11-01"
        hasta="2027-10-31"
        periodoLabel="ejercicio 2026/27"
        cuentas={[{ id: "banco|BGA|santander|ARS", company: "BGA", nombre: "Santander", moneda: "ARS", activa: true }]}
        companyOptions={[{ value: "BGA", short: "BGA", label: "BGA" }, { value: "General", short: "General" }]}
        money={(n: number) => `$${n}`}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
        {...props}
      />
    )
  );
  return { div, root };
};

const fila = (div: HTMLElement) =>
  Array.from(div.querySelectorAll("tr")).find((tr) => (tr.getAttribute("title") || "").includes("abrir la ficha"));

describe("Retiros societarios: la fila solo muestra", () => {
  it("no hay campos editables en la fila", () => {
    const { div, root } = render();
    const f = fila(div)!;
    expect(f).toBeTruthy();
    expect(Array.from(f.querySelectorAll("input, select, textarea"))).toEqual([]);
    act(() => root.unmount());
  });

  it("los datos se siguen leyendo en la fila", () => {
    const { div, root } = render();
    const t = fila(div)!.textContent || "";
    expect(t).toContain("10/11/2026");
    expect(t).toContain("Nicolás");
    expect(t).toContain("Santander");
    expect(t).toContain("Blanco");
    expect(t).toContain("retiro mensual");
    act(() => root.unmount());
  });

  it("si falta la cuenta o el socio lo avisa en la fila", () => {
    const { div, root } = render({ cuentaId: undefined, socio: "" });
    const t = fila(div)!.textContent || "";
    expect(t).toContain("falta la cuenta");
    expect(t).toContain("falta el socio");
    act(() => root.unmount());
  });

  it("el retiro que vino del arqueo del cierre lo dice", () => {
    const { div, root } = render({ origen: "arqueo" });
    expect(fila(div)!.textContent).toContain("del arqueo del cierre");
    act(() => root.unmount());
  });

  const borrar = (f: Element) => Array.from(f.querySelectorAll("button")).filter((b) => (b.textContent || "").includes("✕"));

  it("con el ejercicio cerrado no aparece el botón de borrar, pero sí el de la ficha", () => {
    const { div, root } = render({}, { bloqueado: () => true });
    expect(borrar(fila(div)!)).toEqual([]);
    expect(fila(div)!.querySelector('button[title="Abrir la ficha"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it("con el ejercicio abierto sí está el de borrar", () => {
    const { div, root } = render();
    expect(borrar(fila(div)!)).toHaveLength(1);
    act(() => root.unmount());
  });
});
