// Categorias internas: la planilla muestra las tareas propias y heredadas, el click derecho abre las
// tareas y tildar llega al handler; en la ficha del empleado tildar una categoria suma las incluidas; en
// Fabricacion la cobertura avisa las tareas sin nadie.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CategoriasInternas, CategoriasDelEmpleado } from "./CategoriasInternas";
import { CapacidadesPersonal } from "./CapacidadesPersonal";
import type { CategoriaEmpleado } from "../domain/categoriasEmpleado";
import type { TipoTarea } from "../domain/organizacionDiaria";

const tipos: TipoTarea[] = [
  { id: 100, nombre: "Barrer", unidad: "u", activa: true },
  { id: 400, nombre: "Cortar placas", unidad: "m2", horasEstimadas: 0.5, activa: true },
  { id: 900, nombre: "Armar módulo", unidad: "u", horasEstimadas: 2, activa: true },
];
const cats: CategoriaEmpleado[] = [
  { id: 1, nombre: "Aprendiz", nivel: 1, incluye: [], tareaIds: [100] },
  { id: 4, nombre: "Ayudante de fabricación", nivel: 3, incluye: [1], tareaIds: [400] },
  { id: 9, nombre: "Armador general", nivel: 4, incluye: [4], tareaIds: [] },
];

function montar(el: React.ReactElement) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(el));
  return { div, root };
}

describe("CategoriasInternas", () => {
  it("lista propias y heredadas; click derecho → Tareas… y tildar guarda", () => {
    const onGuardar = jest.fn();
    const { div, root } = montar(
      <CategoriasInternas categorias={cats} tipos={tipos} grupos={[]} empleados={[{ id: 1, name: "Juan", categoriasInternas: [4] }]} onGuardar={onGuardar} onBorrar={jest.fn()} nuevoId={() => 77} />
    );
    const filas = Array.from(div.querySelectorAll("tbody tr"));
    const fila4 = filas.find((f) => f.textContent?.includes("Cortar placas"))!;
    expect(fila4.textContent).toContain("Barrer"); // heredada de Aprendiz
    act(() => {
      fila4.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const btnTareas = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Tareas…")!;
    act(() => btnTareas.click());
    const labelArmar = Array.from(document.querySelectorAll("label")).find((l) => l.textContent?.includes("Armar módulo"))!;
    act(() => (labelArmar.querySelector("input") as HTMLInputElement).click());
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ id: 4, tareaIds: [400, 900] }));
    act(() => root.unmount());
    div.remove();
  });

  it("en la ficha, tildar Armador suma lo incluido y muestra lo que puede hacer", () => {
    const onCambiar = jest.fn();
    const { div, root } = montar(<CategoriasDelEmpleado empleado={{ id: 1, name: "Juan", categoriasInternas: [9] }} categorias={cats} tipos={tipos} onCambiar={onCambiar} />);
    expect(div.textContent).toContain("(incluida)");
    expect(div.textContent).toContain("Lo que puede hacer (2)");
    const labelAprendiz = Array.from(div.querySelectorAll("label")).find((l) => l.textContent?.startsWith("Aprendiz"))!;
    expect((labelAprendiz.querySelector("input") as HTMLInputElement).checked).toBe(true);
    act(() => root.unmount());
    div.remove();
  });

  it("Fabricacion: capacidades por empleado y tareas sin nadie", () => {
    const { div, root } = montar(
      <CapacidadesPersonal
        empleados={[{ id: 1, name: "Juan", company: "De Raíz", categoriasInternas: [4] }, { id: 2, name: "Pedro", company: "BGA" }]}
        categorias={cats}
        tipos={tipos}
        grupos={[]}
        companyShort={(c) => c}
      />
    );
    expect(div.textContent).toContain("Ayudante de fabricación");
    expect(div.textContent).toContain("Sin categoría cargada: Pedro");
    expect(div.textContent).toContain("1 sin nadie");
    expect(div.textContent).toContain("Nadie: puesto a cubrir");
    act(() => root.unmount());
    div.remove();
  });
});
