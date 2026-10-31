// Muebles del presupuesto: muestra las horas de cada mueble con lo cotizado en el bloque, quien hace las tareas
// y "Pasar a mano de obra" manda el plan por persona.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MueblesPresupuesto } from "./MueblesPresupuesto";
import type { TipoMueble } from "../domain/tiposMueble";
import type { TipoTarea } from "../domain/organizacionDiaria";
import type { RubroFabricacion } from "../domain/ganttFabricacion";

const tareas: TipoTarea[] = [
  { id: 1, nombre: "Cortar placas", unidad: "m2", horasEstimadas: 0.5 },
  { id: 2, nombre: "Colocar bisagras", unidad: "u", horasEstimadas: 0.25 },
];
const rubros: RubroFabricacion[] = [{ id: 10, nombre: "Bisagras", unidad: "u", origen: "materiales", palabras: ["bisagra"] }];
const alacena: TipoMueble = {
  id: 1,
  nombre: "Alacena",
  receta: [
    { id: 11, tareaId: 1, paso: 1, factor: 1, base: "m2" },
    { id: 12, tareaId: 2, paso: 2, factor: 1, base: "rubro:10" },
  ],
};

describe("MueblesPresupuesto", () => {
  it("calcula las horas con lo cotizado y las pasa a mano de obra", () => {
    const pasar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() =>
      root.render(
        <MueblesPresupuesto
          muebles={[{ id: 5, tipoMuebleId: 1, cantidad: 2, largo: 1, alto: 1 }]}
          onCambiar={() => {}}
          tipos={[alacena]}
          tareas={tareas}
          rubros={rubros}
          materiales={[{ description: "Bisagra cazoleta", qty: 8 }]}
          personas={[{ id: 7, nombre: "Ana", costoHora: 1000, tareas: [1, 2] }]}
          manoDeObra={[]}
          money={(n) => "$" + n}
          onPasarAManoDeObra={pasar}
          nuevoId={() => 1}
        />
      )
    );
    // cortar 2 m2 × 0,5 = 1 · bisagras 8 × 0,25 = 2
    expect(div.textContent).toContain("3 hs-hombre");
    expect(div.textContent).toContain("Bisagras 8");
    expect(div.textContent).toContain("$3000"); // Ana: 3 h × $1000
    const boton = Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Pasar a mano de obra"))!;
    act(() => boton.click());
    expect(pasar.mock.calls[0][0].porPersona).toEqual([{ personaId: 7, nombre: "Ana", horas: 3, costoHora: 1000, costo: 3000 }]);
    act(() => root.unmount());
  });

  it("los materiales genéricos se eligen en una ventana: arranca con lo elegido antes y pasa lo nuevo", () => {
    const pasar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() =>
      root.render(
        <MueblesPresupuesto
          muebles={[{ id: 5, tipoMuebleId: 1, cantidad: 2, largo: 1, alto: 1 }]}
          onCambiar={() => {}}
          tipos={[{ ...alacena, desperdicioPct: 0, materiales: [{ id: 1, nombre: "Placa", unidad: "m2", grupo: "Melaminas", cantidad: 4.5, stockItemId: 1 }] }]}
          tareas={tareas}
          rubros={rubros}
          materiales={[]}
          personas={[{ id: 7, nombre: "Ana", costoHora: 1000, tareas: [1, 2] }]}
          manoDeObra={[]}
          money={(n) => "$" + n}
          onPasarAManoDeObra={() => {}}
          stock={[
            { id: 1, description: "Melamina blanca", unit: "u", unitPrice: 100, group: "Melaminas" },
            { id: 2, description: "Melamina roble", unit: "u", unitPrice: 150, group: "Melaminas" },
            { id: 3, description: "Bisagra", unit: "u", unitPrice: 5, group: "Herrajes" },
          ]}
          previos={{ "melaminas|placa": { articuloId: 2 } }}
          onPasarMateriales={pasar}
          nuevoId={() => 1}
        />
      )
    );
    const abrir = Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Pasar materiales de los muebles"))!;
    act(() => abrir.click());
    const select = div.querySelector('select[aria-label="Artículo para Placa"]') as HTMLSelectElement;
    expect(select.value).toBe("2");
    // Solo ofrece los artículos del grupo del genérico.
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["(sin elegir)", "Melamina blanca · $100/u", "Melamina roble · $150/u"]);
    // 2 muebles × 4,5 m² = 9 m² → 2 placas (1 placa = 4,5 m²).
    const cantidad = div.querySelector('input[aria-label="Cantidad de Placa"]') as HTMLInputElement;
    expect(cantidad.value).toBe("2");
    expect(div.textContent).toContain("1 placa = 4,5 m2");
    act(() => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Pasar al presupuesto")!.click());
    expect(pasar.mock.calls[0][0].map((f: any) => [f.description, f.qty, f.unitPrice])).toEqual([["Melamina blanca", 2, 100]]);
    act(() => root.unmount());
  });
});
