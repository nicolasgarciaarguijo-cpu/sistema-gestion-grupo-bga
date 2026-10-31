// Bloque "Listados del sistema": agregar, avisar lo que no se puede y renombrar.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ListadosSistema } from "./ListadosSistema";

describe("ListadosSistema", () => {
  it("agrega, no deja borrar lo que está en uso y renombra con doble click", () => {
    const guardar = jest.fn();
    const renombrar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() => root.render(<ListadosSistema listas={{}} usos={{ categoriasGremio: { Ayudante: 4 } }} onGuardar={guardar} onRenombrar={renombrar} />));
    expect(div.textContent).toContain("Categorías del gremio (6)");
    // Borrar Ayudante (en uso): avisa y no guarda.
    const fila = Array.from(div.querySelectorAll("tr")).find((tr) => tr.textContent?.startsWith("Ayudante"))!;
    act(() => Array.from(fila.querySelectorAll("button")).find((b) => b.textContent === "🗑")!.click());
    expect(div.textContent).toContain("está en uso (4)");
    expect(guardar).not.toHaveBeenCalled();
    // Agregar.
    const nuevo = div.querySelector("input[placeholder^='Nuevo en']") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(nuevo, "Oficial de primera");
      nuevo.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "+ Agregar")!.click());
    expect(guardar.mock.calls[0][0]).toBe("categoriasGremio");
    expect(guardar.mock.calls[0][1].map((x: any) => x.nombre)).toContain("Oficial de primera");
    // Tipos de trabajo: General es del sistema (sin renombrar).
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.startsWith("Tipos de trabajo"))!.click());
    const general = Array.from(div.querySelectorAll("tr")).find((tr) => tr.textContent?.startsWith("General"))!;
    expect(general.textContent).toContain("del sistema");
    expect(Array.from(general.querySelectorAll("button")).some((b) => b.textContent === "Renombrar")).toBe(false);
    act(() => root.unmount());
  });
});
