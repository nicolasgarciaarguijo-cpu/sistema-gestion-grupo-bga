import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { TarjetasTab } from "./Tarjetas";
import { FichaTarjeta } from "../ui/FichaTarjeta";
import { fichaDelResumen, type TarjetaF, type ResumenF, type RenglonF } from "../domain/fichaTarjeta";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 14/11/2026: el resumen tiene UNA ficha y ahi se corrige todo.
// 18/11/2026: el bloque "Resúmenes · cierres y vencimientos" de la solapa se ESCONDIO, porque la ficha ya
// tiene todo lo que mostraba ("no quiero visualizarlos si la información la tiene la ficha"). Este test
// falla si el bloque vuelve a aparecer, o si la ficha deja de tener alguno de esos datos.
const card: TarjetaF = { id: 1, company: "BGA", name: "Visa Santander", bank: "Santander", lastDigits: "4411" } as any;
const statement: ResumenF = {
  id: 10,
  company: "BGA",
  cardId: 1,
  closingDate: "2026-10-28",
  dueDate: "2026-11-10",
  totalArs: 1500000,
  totalUsd: 0,
  minPaymentArs: 300000,
  paid: false,
  notes: "",
  archivo: "resumen-octubre.pdf",
} as any;

const montar = (nodo: React.ReactElement) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => root.render(nodo));
  return { div, root };
};

const solapa = () =>
  montar(
    <TarjetasTab
      companyScope="__ALL__"
      onScopeChange={() => {}}
      COMPANY_OPTIONS={[{ value: "BGA", short: "BGA", label: "BGA" }] as any}
      getCompanyMeta={(() => ({ short: "BGA" })) as any}
      cards={[card] as any}
      statements={[statement] as any}
      consumptions={[] as any}
      cardCostSummary={{ ars: { fijo: 0, variable: 0, total: 0 }, usd: { fijo: 0, variable: 0, total: 0 }, byGroup: [] } as any}
      manualGroupOptions={[]}
      createCostGroup={() => ""}
      addCreditCard={() => {}}
      removeCreditCard={() => {}}
      updateCreditCard={() => {}}
      addCreditCardStatement={() => {}}
      removeCreditCardStatement={() => {}}
      updateCreditCardStatement={() => {}}
      addCreditCardConsumption={() => {}}
      removeCreditCardConsumption={() => {}}
      updateCreditCardConsumption={() => {}}
    />
  );

const renglones: RenglonF[] = [
  { id: 101, statementId: 10, cardId: 1, date: "2026-10-05", description: "Pinturería", amount: 1500000, installments: "", currency: "ARS" } as any,
];

const ficha = (cb: { agregar?: () => void; quitar?: (id: number) => void; resumen?: (sid: number, campo: string, valor: any) => void } = {}) =>
  montar(
    <FichaTarjeta
      cuenta={card}
      plasticos={[]}
      fichas={[fichaDelResumen(statement, renglones, [], [card], [statement])]}
      pagos={[]}
      etiquetaPago={() => "pago"}
      pagoComisiones={() => null}
      companyShort={() => "BGA"}
      money={(n) => String(n)}
      onLinkear={() => {}}
      onSoltar={() => {}}
      onComisiones={() => {}}
      onAceptarSugerencias={() => {}}
      onPlastico={() => {}}
      onResumen={cb.resumen || (() => {})}
      onAgregarResumen={cb.agregar}
      onQuitarResumen={cb.quitar}
      onCerrar={() => {}}
    />
  );

const botonPorTexto = (div: HTMLElement, texto: string) =>
  Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === texto) || null;

describe("Resúmenes de tarjeta: la ficha reemplaza al bloque", () => {
  it("la solapa ya no muestra el bloque de resúmenes", () => {
    const { div, root } = solapa();
    expect(div.textContent).not.toContain("cierres y vencimientos");
    expect(div.querySelector('tr[title^="Click: abrir la ficha del resumen"]')).toBeNull();
    act(() => root.unmount());
  });

  it("la solapa ya no muestra el bloque de consumos ni la verificación", () => {
    const { div, root } = solapa();
    expect(div.textContent).not.toContain("planilla por cierre");
    expect(div.textContent).not.toContain("verificación");
    act(() => root.unmount());
  });

  it("la ficha tiene el cierre, el vencimiento, los totales, el pago mínimo y el pagado", () => {
    const { div, root } = ficha();
    const fechas = Array.from(div.querySelectorAll('input[type="date"]')).map((i) => (i as HTMLInputElement).value);
    expect(fechas).toContain("2026-10-28");
    expect(fechas).toContain("2026-11-10");
    const numeros = Array.from(div.querySelectorAll('input[type="number"]')).map((i) => (i as HTMLInputElement).value);
    expect(numeros).toContain("1500000");
    expect(numeros).toContain("300000");
    expect(div.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(div.textContent).toContain("Todavía no");
    act(() => root.unmount());
  });

  it("se agrega y se quita un resumen desde la ficha", () => {
    const agregados: number[] = [];
    const quitados: number[] = [];
    (window as any).confirm = () => true;
    const { div, root } = ficha({ agregar: () => agregados.push(1), quitar: (id) => quitados.push(id) });
    act(() => {
      botonPorTexto(div, "Agregar resumen")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      botonPorTexto(div, "Quitar este resumen")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(agregados).toEqual([1]);
    expect(quitados).toEqual([10]);
    act(() => root.unmount());
  });

  it("marcar pagado sale de la ficha, no de la fila", () => {
    const cambios: Array<[number, string, any]> = [];
    const { div, root } = ficha({ resumen: (sid, campo, valor) => cambios.push([sid, campo, valor]) });
    const chk = div.querySelector('input[type="checkbox"]') as HTMLInputElement;
    act(() => {
      chk.click();
    });
    expect(cambios).toContainEqual([10, "paid", true]);
    act(() => root.unmount());
  });
});
