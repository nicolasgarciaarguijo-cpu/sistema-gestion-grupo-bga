import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaExtracto } from "./FichaExtracto";
import { fichasDeExtracto, type MovimientoF, type PagoBancoF } from "../domain/fichaExtracto";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 23/11/2026: "al finalizar el resumen sumar todos los valores de comisiones y asegurarse que sea el correcto
// [...] nos muestra un total, no suma 2 veces, y si alguna no se cargo marca que falta la carga y brinda el acceso para
// ir directo a cargar la falta para poder linkearla y asi la conciliacion cierra".
const mov = (id: number, amount: number, concept: string, balance: number): MovimientoF => ({ id, company: "BGA", bank: "Santander", currency: "ARS", date: "2026-11-16", concept, movementType: "debito", amount, balance });
const movs = [mov(1, 100, "Impuesto ley 25.413 debito 0,6%", 900), mov(2, 50, "Impuesto ley 25.413 credito 0,6%", 850), mov(3, 30, "Iva 21% reg de transfisc", 820)];
const pago = (id: number, amount: number, extra: Partial<PagoBancoF> = {}): PagoBancoF => ({ id, company: "BGA", date: "2026-11-16", amount, supplier: "Banco Santander", description: "cargo a mano", paymentMethod: "debito", impuestoBanco: true, cuentaId: "banco|BGA|santander|ARS", ...extra });

const montar = (pagos: PagoBancoF[], props: Partial<React.ComponentProps<typeof FichaExtracto>> = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() =>
    createRoot(div).render(
      <FichaExtracto
        titulo="Santander · BGA · $"
        meses={fichasDeExtracto(movs, pagos, [])}
        money={(n) => `$${n}`}
        opciones={() => []}
        onLink={() => {}}
        onTipo={() => {}}
        onDesconocer={() => {}}
        onSoltar={() => {}}
        onCerrar={() => {}}
        renglones={[]}
        etiquetaRenglon={(k) => k}
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
  return div;
};
const control = (div: HTMLElement) => div.querySelector("[data-control-comisiones]") as HTMLElement;

describe("control de comisiones en la ficha del extracto", () => {
  it("muestra el total del banco, lo ya linkeado, lo que falta linkear y lo que falta cargar", () => {
    const div = montar([pago(10, 100, { bankEntryId: 1 }), pago(11, 50)]);
    const t = control(div).textContent || "";
    expect(t).toContain("el banco cobró $180");
    expect(t).toContain("cargado y linkeado $100");
    expect(t).toContain("cargado, falta linkear $50");
    expect(t).toContain("FALTA CARGAR $30");
    expect(t).not.toContain("coincide con el banco");
  });

  it("el boton de la que falta manda a cargarla y linkearla; el de la sugerida la linkea", () => {
    const onCargarComisiones = jest.fn();
    const onLink = jest.fn();
    const div = montar([pago(10, 100, { bankEntryId: 1 }), pago(11, 50)], { onCargarComisiones, onLink });
    act(() => (control(div).querySelector('[data-cargar="3"]') as HTMLButtonElement).click());
    expect(onCargarComisiones).toHaveBeenCalledWith([3]);
    act(() => (control(div).querySelector("[data-aceptar-todas]") as HTMLButtonElement).click());
    expect(onLink).toHaveBeenCalledWith(2, "pago", "11");
  });

  it("con todo cargado y linkeado dice que coincide con el banco", () => {
    const div = montar([pago(10, 100, { bankEntryId: 1 }), pago(11, 50, { bankEntryId: 2 }), pago(12, 30, { bankEntryId: 3 })]);
    const t = control(div).textContent || "";
    expect(t).toContain("coincide con el banco");
    expect(t).not.toContain("FALTA CARGAR");
  });
});
