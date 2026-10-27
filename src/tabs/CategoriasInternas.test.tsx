// Categorias internas: la planilla muestra las tareas propias y heredadas, el click derecho abre las
// tareas y tildar llega al handler; en la ficha del empleado tildar una categoria suma las incluidas; en
// Fabricacion la cobertura avisa las tareas sin nadie.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CategoriasInternas, CategoriasDelEmpleado } from "./CategoriasInternas";
import { CapacidadesPersonal } from "./CapacidadesPersonal";
import { TiposMueble } from "./TiposMueble";
import { Mantenimiento } from "./Mantenimiento";
import type { TipoMueble } from "../domain/tiposMueble";
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

describe("TiposMueble", () => {
  it("lista la receta por pasos y el editor calcula los tiempos", () => {
    const tareas: TipoTarea[] = [
      { id: 1, nombre: "Cortar placas", unidad: "m2", horasEstimadas: 0.5 },
      { id: 2, nombre: "Cantear", unidad: "ml", horasEstimadas: 0.1 },
      { id: 3, nombre: "Mecanizar", unidad: "u", horasEstimadas: 1 },
    ];
    const tipo: TipoMueble = {
      id: 10,
      nombre: "Bajo mesada",
      largo: 2,
      alto: 0.8,
      profundidad: 0.6,
      receta: [
        { id: 101, tareaId: 1, paso: 1, factor: 2.5, base: "m2" },
        { id: 102, tareaId: 2, paso: 2, factor: 3, base: "ml" },
        { id: 103, tareaId: 3, paso: 2, factor: 2, base: "u" },
      ],
    };
    const { div, root } = montar(<TiposMueble tipos={[tipo]} tareas={tareas} grupos={[]} onGuardar={jest.fn()} onBorrar={jest.fn()} nuevoId={() => 5} />);
    const fila = Array.from(div.querySelectorAll("tbody tr")).find((f) => f.textContent?.includes("2.1 Cantear"))!;
    expect(fila.textContent).toContain("2.2 Mecanizar");
    act(() => {
      fila.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    act(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Abrir ficha (tareas y tiempos)…")!.click());
    // 2 h cortar + (0,6 cantear ∥ 2 mecanizar): 4,6 h-hombre y 4 h de reloj
    expect(document.body.textContent).toContain("4,6 h-hombre");
    expect(document.body.textContent).toContain("4 h de reloj");
    act(() => root.unmount());
    div.remove();
  });
});

describe("Mantenimiento", () => {
  it("lista las máquinas con su estado, los preventivos vencidos y las tareas trabadas", () => {
    const { div, root } = montar(
      <Mantenimiento
        maquinas={[{ id: 1, description: "Seccionadora", group: "Maquinas pesadas", quantity: 1, company: "General" }]}
        fichas={[{ stockItemId: 1, estado: "fuera_de_servicio", planes: [{ id: 5, descripcion: "Correas", cadaDias: 30, ultimaFecha: "2026-09-01" }], historial: [] }]}
        tipos={[{ id: 100, nombre: "Cortar placas", herramientas: [1] }]}
        grupos={[]}
        categorias={[]}
        empleados={[]}
        asignaciones={[]}
        hoy="2026-10-26"
        companyShort={(c) => c}
        onGuardarFicha={jest.fn()}
        onGuardarAsignacion={jest.fn()}
        onCrearEnStock={() => 2}
        onPrepararCatalogo={jest.fn()}
        onIrAStock={jest.fn()}
        nuevoId={() => 9}
      />
    );
    expect(div.textContent).toContain("Fuera de servicio");
    expect(div.textContent).toContain("vencido hace 25 d");
    expect(div.textContent).toContain("Cortar placas no se puede hacer: Seccionadora (fuera de servicio)");
    act(() => root.unmount());
    div.remove();
  });
});
