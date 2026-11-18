import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { BarraEjercicio, AvisoEscondidoPorEjercicio } from "./BarraEjercicio";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 18/11/2026: la barra es la UNICA puerta al ejercicio anterior. Si deja de estar, o deja de
// avisar lo que esconde, esconder se vuelve indistinguible de borrar.
const montar = (nodo: React.ReactElement) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(nodo));
  return { div, root };
};

const fechas = (y: number) => `01/11/${y} – 31/10/${y + 1}`;

describe("la barra del ejercicio", () => {
  it("marca el que está en curso y ofrece el anterior", () => {
    const { div, root } = montar(<BarraEjercicio anio={2026} corriente={2026} cerrados={[]} fechas={fechas} onElegir={() => {}} />);
    const botones = Array.from(div.querySelectorAll("button")).map((b) => b.textContent || "");
    expect(botones[0]).toContain("En curso");
    expect(botones[0]).toContain("01/11/2026");
    expect(botones[1]).toContain("01/11/2025");
    expect(div.textContent).not.toContain("Estás viendo otro ejercicio");
    act(() => root.unmount());
  });

  it("avisa cuando el elegido no es el de hoy, y dice si está cerrado", () => {
    const { div, root } = montar(<BarraEjercicio anio={2025} corriente={2026} cerrados={[2025]} fechas={fechas} onElegir={() => {}} />);
    expect(div.textContent).toContain("Estás viendo otro ejercicio");
    expect(div.textContent).toContain("cerrado: solo lectura");
    act(() => root.unmount());
  });

  it("el click elige ese ejercicio", () => {
    const elegidos: number[] = [];
    const { div, root } = montar(<BarraEjercicio anio={2026} corriente={2026} cerrados={[]} fechas={fechas} onElegir={(y) => elegidos.push(y)} />);
    const anterior = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").includes("01/11/2025"))!;
    act(() => anterior.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(elegidos).toEqual([2025]);
    act(() => root.unmount());
  });

  it("no repite un ejercicio que ya está en la lista", () => {
    const { div, root } = montar(<BarraEjercicio anio={2025} corriente={2026} cerrados={[2025, 2025]} fechas={fechas} onElegir={() => {}} />);
    expect(div.querySelectorAll("button").length).toBe(2);
    act(() => root.unmount());
  });
});

describe("el aviso de lo que quedó afuera", () => {
  it("dice cuántos hay de antes y que no se borró nada", () => {
    const { div, root } = montar(<AvisoEscondidoPorEjercicio anteriores={12} posteriores={0} desdeIso="2026-11-01" />);
    expect(div.textContent).toContain("12 de antes del 01/11/2026");
    expect(div.textContent).toContain("Nada se borró");
    expect(div.textContent).toContain("elegí ese ejercicio");
    act(() => root.unmount());
  });

  it("también cuenta lo posterior", () => {
    const { div, root } = montar(<AvisoEscondidoPorEjercicio anteriores={2} posteriores={3} desdeIso="2026-11-01" />);
    expect(div.textContent).toContain("2 de antes");
    expect(div.textContent).toContain("3 posterior(es)");
    act(() => root.unmount());
  });

  it("sin nada escondido no dice nada", () => {
    const { div, root } = montar(<AvisoEscondidoPorEjercicio anteriores={0} posteriores={0} desdeIso="2026-11-01" />);
    expect(div.textContent).toBe("");
    act(() => root.unmount());
  });
});
