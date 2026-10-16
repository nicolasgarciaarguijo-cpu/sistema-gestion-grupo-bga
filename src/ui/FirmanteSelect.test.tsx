// El firmante de un movimiento de plata es SIEMPRE el usuario que opera (Nicolas, 2026-10-16): no se elige.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FirmanteCelda, FirmanteFijo, UsuarioFirmanteContext, faltaFirmante, textoFirmante } from "./FirmanteSelect";

function montar(el: React.ReactElement) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(el));
  return { div, root };
}

describe("firmante", () => {
  it("falta si esta vacio o en blanco", () => {
    expect(faltaFirmante(undefined)).toBe(true);
    expect(faltaFirmante("   ")).toBe(true);
    expect(faltaFirmante("Gustavo")).toBe(false);
    expect(textoFirmante("Gustavo")).toBe("Firmante: Gustavo");
    expect(textoFirmante("Gustavo", "2026-10-16T14:05:00.000Z")).toBe("Firmante: Gustavo · 2026-10-16 14:05");
  });

  it("el formulario muestra al usuario que opera, sin selector", () => {
    const { div, root } = montar(
      <UsuarioFirmanteContext.Provider value="Nicolás García">
        <FirmanteFijo previo="Gustavo" />
      </UsuarioFirmanteContext.Provider>
    );
    expect(div.querySelector("select")).toBeNull();
    expect(div.textContent).toContain("Nicolás García");
    expect(div.textContent).toContain("antes: Gustavo");
    act(() => root.unmount());
  });

  it("la celda de una fila vieja sin firmante avisa", () => {
    const vieja = montar(<FirmanteCelda value={undefined} />);
    expect(vieja.div.textContent).toContain("sin firmante");
    act(() => vieja.root.unmount());
    const firmada = montar(<FirmanteCelda value="Ana" />);
    expect(firmada.div.textContent).toContain("Ana");
    expect(firmada.div.querySelector("select")).toBeNull();
    act(() => firmada.root.unmount());
  });
});
