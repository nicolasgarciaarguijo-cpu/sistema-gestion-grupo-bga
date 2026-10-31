// Bloque "Equivalencias y criterios": se leen las reglas con su criterio y se editan en la ventana.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { EquivalenciasYCriterios } from "./Equivalencias";
import { CONVERTIDOR_POR_DEFECTO, reglaDeCompraPara, cantidadAComprar } from "../domain/tiposMueble";

describe("EquivalenciasYCriterios", () => {
  it("muestra las reglas con su criterio y abre la ventana para editar", () => {
    const guardar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() => root.render(<EquivalenciasYCriterios convertidor={CONVERTIDOR_POR_DEFECTO} stock={[]} onGuardar={guardar} nuevoId={() => 99} />));
    expect(div.textContent).toContain("1 placa = 4,5 m2");
    expect(div.textContent).toContain("La placa cuenta con 4,5 m² aprovechables");
    expect(div.textContent).toContain("para arriba, mínimo 3");
    expect(div.textContent).toContain("suma Catalizador: 0,5 L por cada 1 que se usa");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "✎ Editar")!.click());
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "+ Regla de compra")!.click());
    expect(guardar.mock.calls[0][0].compras).toHaveLength(CONVERTIDOR_POR_DEFECTO.compras.length + 1);
    act(() => root.unmount());
  });

  it("laca incolora, blanca y negra son de compra intensiva; la de color, mínimo 3 L", () => {
    const regla = (description: string) => reglaDeCompraPara("Laca", { id: 1, group: "Pinturas", description }, CONVERTIDOR_POR_DEFECTO.compras);
    expect(cantidadAComprar(1.4, regla("Laca poliuretanica INCOLORA"))).toBe(1.4);
    expect(cantidadAComprar(1.4, regla("Laca poliuretanica BLANCA"))).toBe(1.4);
    expect(cantidadAComprar(1.4, regla("Laca poliuretanica NEGRA"))).toBe(1.4);
    expect(cantidadAComprar(1.4, regla("Laca poliuretanica COLOR"))).toBe(3);
  });
});
