import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaRegistro } from "./FichaRegistro";

describe("FichaRegistro", () => {
  it("muestra los campos con la empresa y guarda cada cambio", () => {
    const cambiar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() =>
      root.render(
        <FichaRegistro
          titulo="ART"
          valores={{ company: "BGA SRL", tipo: "ART", activo: true }}
          campos={[
            { key: "company", label: "Empresa", tipo: "empresa" },
            { key: "tipo", label: "Tipo", tipo: "texto" },
            { key: "activo", label: "Activo", tipo: "check" },
          ]}
          empresas={[{ value: "BGA SRL", short: "BGA" }, { value: "De Raiz SA", short: "De Raíz" }]}
          onCambiar={cambiar}
          onCerrar={() => {}}
        />
      )
    );
    const sel = div.querySelector("select") as HTMLSelectElement;
    // Lo que mueve plata no ofrece "Ambas" (compartido solo si el campo lo pide).
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(["BGA", "De Raíz"]);
    act(() => {
      sel.value = "De Raiz SA";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(cambiar).toHaveBeenCalledWith("company", "De Raiz SA");
    act(() => (div.querySelector("input[type=checkbox]") as HTMLInputElement).click());
    expect(cambiar).toHaveBeenCalledWith("activo", false);
    act(() => root.unmount());
  });
});
