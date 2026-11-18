import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaExtracto } from "./FichaExtracto";
import { fichasDeExtracto, type MovimientoF } from "../domain/fichaExtracto";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 18/11/2026: la ficha de la cuenta REEMPLAZA al bloque "Movimientos bancarios · el banco real".
// Antes de esconderlo habia dos datos que solo vivian ahi: el RENGLON del Calendario anual donde se imputa
// cada movimiento y el BLANCO/NEGRO. Tambien la nota, el adjunto, agregar y borrar el movimiento.
// Este test falla si alguno de esos vuelve a quedar afuera de la ficha.
const mov: MovimientoF = {
  id: 7,
  company: "BGA",
  bank: "Patagonia",
  currency: "ARS",
  date: "2026-11-05",
  concept: "Impuesto ley 25.413 debito 0,6%",
  movementType: "debito",
  amount: 16856.67,
  balance: 100000,
};

const RENGLONES = [{ key: "bancos", label: "Bancos", items: [{ key: "b_imp_ley_25413", label: "Impuesto al débito y crédito" }] }];

const montar = (props: Partial<React.ComponentProps<typeof FichaExtracto>> = {}, m: MovimientoF = mov) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <FichaExtracto
        titulo="Patagonia · BGA · $"
        meses={fichasDeExtracto([m], [], [])}
        money={(n) => String(n)}
        opciones={() => []}
        onLink={() => {}}
        onTipo={() => {}}
        onDesconocer={() => {}}
        onSoltar={() => {}}
        onCerrar={() => {}}
        renglones={RENGLONES}
        etiquetaRenglon={(k) => RENGLONES[0].items.find((i) => i.key === k)?.label || k}
        onRenglon={() => {}}
        onCircuito={() => {}}
        onBorrar={() => {}}
        onLimpiar={() => {}}
        onNota={() => {}}
        onAdjunto={() => {}}
        sugerenciaRenglon={() => null}
        {...props}
      />
    )
  );
  return { div, root };
};

const fila = (div: HTMLElement) => Array.from(div.querySelectorAll("tbody tr")).find((tr) => (tr.textContent || "").includes("25.413"))!;
const abrirMenu = (div: HTMLElement) => {
  act(() => {
    fila(div).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
  });
};
const itemPorTexto = (texto: string) =>
  Array.from(document.body.querySelectorAll("button, div[role='button']")).find((b) => (b.textContent || "").includes(texto)) as HTMLElement | undefined;

describe("Ficha de la cuenta: renglón y blanco/negro", () => {
  it("la fila dice que no tiene renglón y no trae campos editables", () => {
    const { div, root } = montar();
    expect(fila(div).textContent).toContain("sin renglón");
    expect(Array.from(fila(div).querySelectorAll("select, textarea"))).toEqual([]);
    act(() => root.unmount());
  });

  it("muestra el renglón y la B/N cuando los tiene", () => {
    const { div, root } = montar({}, { ...mov, conceptKey: "b_imp_ley_25413", administration: "negro" });
    const t = fila(div).textContent || "";
    expect(t).toContain("Impuesto al débito y crédito");
    expect(t).toContain("N");
    act(() => root.unmount());
  });

  it("el renglón se elige con el click derecho", () => {
    const puestos: Array<[number, string]> = [];
    const { div, root } = montar({ onRenglon: (id, k) => puestos.push([id, k]) });
    abrirMenu(div);
    act(() => itemPorTexto("Renglón del Calendario")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => itemPorTexto("Impuesto al débito y crédito")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(puestos).toEqual([[7, "b_imp_ley_25413"]]);
    act(() => root.unmount());
  });

  it("el circuito blanco/negro se cambia con el click derecho", () => {
    const circuitos: Array<[number, string | null]> = [];
    const { div, root } = montar({ onCircuito: (id, c) => circuitos.push([id, c]) });
    abrirMenu(div);
    act(() => itemPorTexto("Circuito negro")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(circuitos).toEqual([[7, "negro"]]);
    act(() => root.unmount());
  });

  it("estando en negro, volver a elegir negro lo saca", () => {
    const circuitos: Array<[number, string | null]> = [];
    const { div, root } = montar({ onCircuito: (id, c) => circuitos.push([id, c]) }, { ...mov, administration: "negro" });
    abrirMenu(div);
    act(() => itemPorTexto("Circuito negro")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(circuitos).toEqual([[7, null]]);
    act(() => root.unmount());
  });

  it("el movimiento se borra desde la ficha", () => {
    (window as any).confirm = () => true;
    const borrados: number[] = [];
    const { div, root } = montar({ onBorrar: (id) => borrados.push(id) });
    abrirMenu(div);
    act(() => itemPorTexto("Borrar el movimiento")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(borrados).toEqual([7]);
    act(() => root.unmount());
  });

  it("se puede agregar un movimiento a mano desde la ficha", () => {
    let n = 0;
    const { div, root } = montar({ onAgregarMovimiento: () => (n += 1) });
    const btn = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Agregar movimiento")!;
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(n).toBe(1);
    act(() => root.unmount());
  });

  it("la clasificación sugerida se aplica de una vez para todo el mes", () => {
    const puestos: Array<[number, string]> = [];
    const { div, root } = montar({
      sugerenciaRenglon: (m) => (m.conceptKey ? null : "b_imp_ley_25413"),
      onRenglon: (id, k) => puestos.push([id, k]),
    });
    const btn = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Clasificar"))!;
    expect(btn).toBeTruthy();
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(puestos).toEqual([[7, "b_imp_ley_25413"]]);
    act(() => root.unmount());
  });
});
