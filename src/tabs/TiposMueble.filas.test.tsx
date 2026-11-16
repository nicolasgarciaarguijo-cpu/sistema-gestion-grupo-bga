import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { TiposMueble } from "./TiposMueble";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 16/11/2026: era la última solapa con un campo editable en la fila del listado (el nombre).
// Ahora la fila solo muestra y el click abre la ficha, que es donde se corrige todo: el nombre, la
// descripción, las medidas habituales, la cuadrilla, las tareas, los materiales y la receta.
const tipo = {
  id: 1,
  nombre: "Vanitory",
  descripcion: "con cajones",
  receta: [],
  largo: 1.2,
  alto: 0.9,
  profundidad: 0.5,
  activa: true,
};

const render = (extra: any = {}, props: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <TiposMueble
        tipos={[{ ...tipo, ...extra }] as any}
        tareas={[]}
        grupos={[]}
        onGuardar={() => {}}
        onBorrar={() => {}}
        nuevoId={() => 99}
        {...props}
      />
    )
  );
  return { div, root };
};

const fila = (div: HTMLElement) =>
  Array.from(div.querySelectorAll("tbody tr")).find((tr) => (tr.textContent || "").includes("Vanitory"));

describe("Tipos de mueble: la fila solo muestra", () => {
  it("no hay campos editables en la fila del listado", () => {
    const { div, root } = render();
    const f = fila(div)!;
    expect(f).toBeTruthy();
    expect(Array.from(f.querySelectorAll("input, select, textarea"))).toEqual([]);
    act(() => root.unmount());
  });

  it("la fila muestra el nombre, la descripción y las medidas", () => {
    const { div, root } = render();
    const t = fila(div)!.textContent || "";
    expect(t).toContain("Vanitory");
    expect(t).toContain("con cajones");
    expect(t).toContain("1,2 × 0,9 × 0,5");
    act(() => root.unmount());
  });

  it("el click en la fila abre la ficha del tipo", () => {
    const { div, root } = render();
    act(() => {
      fila(div)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // La ficha trae el nombre editable y el bloque de la cuadrilla.
    expect(document.body.textContent).toContain("Personas que lo hacen");
    act(() => root.unmount());
  });

  it("el punto verde pausa sin abrir la ficha", () => {
    const guardados: any[] = [];
    const { div, root } = render({}, { onGuardar: (t: any) => guardados.push(t) });
    const punto = fila(div)!.querySelector('span[title^="Activo"]')!;
    act(() => {
      punto.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(guardados).toHaveLength(1);
    expect(guardados[0].activa).toBe(false);
    expect(document.body.textContent).not.toContain("Personas que lo hacen");
    act(() => root.unmount());
  });

  it("el tipo pausado lo dice en la fila", () => {
    const { div, root } = render({ activa: false });
    expect(fila(div)!.textContent).toContain("pausado");
    act(() => root.unmount());
  });
});
