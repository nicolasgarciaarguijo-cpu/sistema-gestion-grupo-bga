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

// VALIDACION (Nicolas, 21/11/2026). Estas fichas guardan cada cambio al momento: no hay un "Guardar" que frenar.
// La ficha marca lo que falta o esta mal, lo lista arriba y el boton de salir lo dice.
describe("FichaRegistro · validación", () => {
  const campos: any[] = [
    { key: "fecha", label: "Fecha", tipo: "fecha", obligatorio: true },
    { key: "socio", label: "Socio que retira", tipo: "texto", obligatorio: true },
    { key: "monto", label: "Monto", tipo: "numero", obligatorio: true },
    { key: "motivo", label: "Motivo", tipo: "texto" },
  ];
  const pintar = (valores: any) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    act(() => createRoot(div).render(<FichaRegistro titulo="Retiro" valores={valores} campos={campos} empresas={[]} onCambiar={() => {}} onCerrar={() => {}} />));
    return div;
  };

  it("una ficha completa no avisa nada y el boton dice Listo", () => {
    const div = pintar({ fecha: "2026-11-10", socio: "Nicolás", monto: 2500000 });
    expect(div.querySelector("[data-problemas-ficha]")).toBeNull();
    expect(div.querySelector("[data-cerrar-ficha]")!.textContent).toBe("Listo");
  });

  it("lista lo que falta, marca cada campo y el boton de salir lo dice", () => {
    const div = pintar({ fecha: "", socio: "", monto: 0, motivo: "" });
    const aviso = div.querySelector("[data-problemas-ficha]")!.textContent || "";
    expect(aviso).toContain("Fecha (falta)");
    expect(aviso).toContain("Socio que retira (falta)");
    expect(aviso).toContain("Monto (falta)");
    expect(aviso).not.toContain("Motivo");
    expect(Array.from(div.querySelectorAll("[data-problema]")).map((x) => x.getAttribute("data-problema"))).toEqual(["fecha", "socio", "monto"]);
    expect(div.querySelector("[data-cerrar-ficha]")!.textContent).toBe("Cerrar igual (faltan 3 datos)");
  });

  it("un monto negativo y una fecha rota se marcan con su motivo", () => {
    const div = pintar({ fecha: "22026-11-10", socio: "Nicolás", monto: -500 });
    expect(div.querySelector('[data-problema="fecha"]')!.textContent).toBe("no es una fecha válida");
    expect(div.querySelector('[data-problema="monto"]')!.textContent).toBe("no puede ser negativo");
    expect(div.querySelector("[data-cerrar-ficha]")!.textContent).toBe("Cerrar igual (faltan 2 datos)");
  });

  it("no impide cerrar: la ficha ya guardo cada cambio", () => {
    const cerrar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    act(() => createRoot(div).render(<FichaRegistro titulo="Retiro" valores={{}} campos={campos} empresas={[]} onCambiar={() => {}} onCerrar={cerrar} />));
    act(() => (div.querySelector("[data-cerrar-ficha]") as HTMLButtonElement).click());
    expect(cerrar).toHaveBeenCalled();
  });
});
