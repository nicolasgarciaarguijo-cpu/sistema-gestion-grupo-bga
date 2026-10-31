import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { EmpresaSelect, etiquetaEmpresa } from "./EmpresaSelect";

const opciones = [{ value: "BGA SRL", short: "BGA" }, { value: "De Raiz SA", short: "De Raíz" }];

describe("EmpresaSelect", () => {
  it("ofrece las empresas y Ambas (compartido), salvo que no corresponda", () => {
    const div = document.createElement("div");
    const root = createRoot(div);
    act(() => root.render(<EmpresaSelect value="General" opciones={opciones} onChange={() => {}} />));
    expect(Array.from(div.querySelectorAll("option")).map((o) => o.textContent)).toEqual(["BGA", "De Raíz", "Ambas (compartido)"]);
    act(() => root.render(<EmpresaSelect value="BGA SRL" opciones={opciones} compartido={false} onChange={() => {}} />));
    expect(Array.from(div.querySelectorAll("option")).map((o) => o.textContent)).toEqual(["BGA", "De Raíz"]);
    act(() => root.unmount());
  });
  it("etiqueta", () => {
    expect(etiquetaEmpresa("General", opciones)).toBe("Ambas (compartido)");
    expect(etiquetaEmpresa("De Raiz SA", opciones)).toBe("De Raíz");
  });
});
