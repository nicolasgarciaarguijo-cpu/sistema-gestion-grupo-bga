// Miles mientras se escribe (Nicolas, 2026-10-20), sin cambiar lo que recibe el handler.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import NumInput from "./NumInput";

function montar(el: React.ReactElement) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(el));
  return { input: div.querySelector("input") as HTMLInputElement, root };
}

// Tipear como el navegador: cambia el value nativo y dispara el evento que escucha React.
function tipear(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    input.focus();
    setter.call(input, texto);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("NumInput", () => {
  it("muestra los miles mientras se escribe y le pasa el numero crudo al handler", () => {
    const valores: string[] = [];
    const { input } = montar(<NumInput value="" onChange={(e) => valores.push(e.target.value)} />);
    tipear(input, "1250000");
    expect(input.value).toBe("1.250.000");
    expect(valores.pop()).toBe("1250000");
    tipear(input, "1.250.000,5");
    expect(input.value).toBe("1.250.000,5");
    expect(valores.pop()).toBe("1250000.5");
  });

  it("el punto del teclado numerico al final es la coma decimal", () => {
    const { input } = montar(<NumInput value="" onChange={() => {}} />);
    tipear(input, "12.");
    expect(input.value).toBe("12,");
  });

  it("muestra el valor de afuera formateado y admite negativos", () => {
    const { input, root } = montar(<NumInput value={-3500000} onChange={() => {}} />);
    expect(input.value).toBe("-3.500.000");
    act(() => root.render(<NumInput value={7.5} onChange={() => {}} />));
    expect(input.value).toBe("7,5");
  });
});
