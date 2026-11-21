import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ResumenDelDia, type RenglonResumen } from "./ResumenDelDia";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 21/11/2026: "el aviso lo prefiero con las ventanas emergentes".
const renglones = (ir?: () => void): RenglonResumen[] => [
  { clave: "cobros", icono: "💰", titulo: "3 cobros para confirmar", detalle: "$ 8.030.630", tono: "urgente", ir, irTexto: "Ver" },
  { clave: "extracto", icono: "🏦", titulo: "2 cuentas sin extracto", tono: "aviso" },
];
const pintar = (props: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() => createRoot(div).render(<ResumenDelDia renglones={renglones()} hoy="2026-11-21" usuario="nico" {...props} />));
  return div;
};
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

beforeEach(() => window.localStorage.clear());

describe("ResumenDelDia", () => {
  it("aparece sola al entrar, flotante y sin tapar la pantalla", () => {
    const div = pintar();
    const v = div.querySelector("[data-resumen-del-dia]") as HTMLElement;
    expect(v.textContent).toContain("Resumen de hoy · 21/11/2026");
    expect(v.querySelectorAll("[data-renglon-resumen]")).toHaveLength(2);
    expect(v.style.position).toBe("fixed");
    expect(v.style.inset).toBe("");
  });

  it("«Seguir trabajando» la cierra por hoy y deja el boton para reabrirla", () => {
    const div = pintar();
    click(div.querySelector("[data-cerrar-resumen]")!);
    expect(div.querySelector("[data-resumen-del-dia]")).toBeNull();
    expect(div.querySelector("[data-abrir-resumen]")!.textContent).toContain("Hoy · 2");
    // Si vuelve a entrar el mismo dia, no reaparece sola.
    expect(pintar().querySelector("[data-resumen-del-dia]")).toBeNull();
    // Al dia siguiente, si.
    expect(pintar({ hoy: "2026-11-22" }).querySelector("[data-resumen-del-dia]")).toBeTruthy();
    // Y a otro usuario le aparece igual.
    expect(pintar({ usuario: "joaquin" }).querySelector("[data-resumen-del-dia]")).toBeTruthy();
  });

  it("el boton chico la vuelve a abrir", () => {
    const div = pintar();
    click(div.querySelector("[data-cerrar-resumen]")!);
    click(div.querySelector("[data-abrir-resumen]")!);
    expect(div.querySelector("[data-resumen-del-dia]")).toBeTruthy();
  });

  it("cada renglon lleva a donde se resuelve", () => {
    const ir = jest.fn();
    const div = pintar({ renglones: renglones(ir) });
    click(Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Ver")!);
    expect(ir).toHaveBeenCalled();
  });

  it("sin nada para mostrar no dibuja nada", () => {
    const div = pintar({ renglones: [] });
    expect(div.querySelector("[data-resumen-del-dia]")).toBeNull();
    expect(div.querySelector("[data-abrir-resumen]")).toBeNull();
  });
});
