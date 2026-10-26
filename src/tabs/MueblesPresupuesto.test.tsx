// Muebles del presupuesto: muestra las horas de cada mueble con lo cotizado en el bloque y "Pasar las horas a
// mano de obra" manda el total.
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
          horasEnManoDeObra={0}
          hayManoDeObra
          onPasarAManoDeObra={pasar}
          nuevoId={() => 1}
        />
      )
    );
    // cortar 2 m2 × 0,5 = 1 · bisagras 8 × 0,25 = 2
    expect(div.textContent).toContain("3 hs-hombre");
    expect(div.textContent).toContain("Bisagras 8");
    const boton = Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Pasar las horas"))!;
    act(() => boton.click());
    expect(pasar).toHaveBeenCalledWith(3);
    act(() => root.unmount());
  });
});
