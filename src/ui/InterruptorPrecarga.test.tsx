// El boton de la precarga ES el interruptor: tocarlo la apaga si esta encendida y al reves.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { InterruptorPrecarga } from "../ui/InterruptorPrecarga";

function montar(activa: boolean, onChange: (v: boolean) => void) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(<InterruptorPrecarga activa={activa} onChange={onChange} />));
  return { div, root };
}

describe("InterruptorPrecarga", () => {
  it("encendida: dice ENCENDIDA y tocarlo la apaga", () => {
    const onChange = jest.fn();
    const { div, root } = montar(true, onChange);
    expect(div.textContent).toContain("ENCENDIDA");
    act(() => (div.querySelector("button") as HTMLButtonElement).click());
    expect(onChange).toHaveBeenCalledWith(false);
    act(() => root.unmount());
    div.remove();
  });
  it("apagada: dice APAGADA y tocarlo la enciende", () => {
    const onChange = jest.fn();
    const { div, root } = montar(false, onChange);
    expect(div.textContent).toContain("APAGADA");
    act(() => (div.querySelector("button") as HTMLButtonElement).click());
    expect(onChange).toHaveBeenCalledWith(true);
    act(() => root.unmount());
    div.remove();
  });
});
