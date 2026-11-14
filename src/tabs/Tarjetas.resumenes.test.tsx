import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { TarjetasTab } from "./Tarjetas";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 14/11/2026: el resumen tiene UNA ficha (la del linkeo, que se abre desde Bancos) y ahi se corrige
// todo. La fila de la solapa Tarjetas solo muestra. Este test falla si alguien vuelve a poner un campo
// editable en la fila del resumen.
const card = { id: 1, company: "BGA", name: "Visa Santander", bank: "Santander", lastDigits: "4411", active: true };
const statement = {
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
};

const render = (extra: any = {}, onAbrirResumen?: any) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <TarjetasTab
        companyScope="__ALL__"
        onScopeChange={() => {}}
        COMPANY_OPTIONS={[{ value: "BGA", short: "BGA", label: "BGA" }]}
        getCompanyMeta={() => ({ short: "BGA" })}
        cards={[card] as any}
        statements={[{ ...statement, ...extra }] as any}
        consumptions={[] as any}
        cardCostSummary={{
          ars: { fijo: 0, variable: 0, total: 0 },
          usd: { fijo: 0, variable: 0, total: 0 },
          byGroup: [],
        } as any}
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
        onAbrirResumen={onAbrirResumen}
      />
    )
  );
  return { div, root };
};

const filaDelResumen = (div: HTMLElement) => div.querySelector('tr[title^="Click: abrir la ficha del resumen"]');

describe("Tarjetas: la fila del resumen solo muestra", () => {
  it("no hay campos editables en la fila del resumen", () => {
    const { div, root } = render();
    const fila = filaDelResumen(div)!;
    expect(fila).toBeTruthy();
    expect(Array.from(fila.querySelectorAll("input, select, textarea"))).toEqual([]);
    act(() => root.unmount());
  });

  it("los datos del resumen se siguen leyendo en la fila", () => {
    const { div, root } = render();
    const t = filaDelResumen(div)!.textContent || "";
    expect(t).toContain("Visa Santander");
    expect(t).toContain("28");
    expect(t).toContain("1.500.000");
    expect(t).toContain("del PDF");
    act(() => root.unmount());
  });

  it("si no tiene vencimiento lo avisa", () => {
    const { div, root } = render({ dueDate: "" });
    expect(filaDelResumen(div)!.textContent).toContain("falta");
    act(() => root.unmount());
  });

  it("el resumen cargado a mano se distingue del leído del PDF", () => {
    const { div, root } = render({ archivo: undefined });
    expect(filaDelResumen(div)!.textContent).toContain("a mano");
    act(() => root.unmount());
  });

  it("el click en la fila abre la ficha de ese resumen", () => {
    const abiertos: Array<[number, number]> = [];
    const { div, root } = render({}, (cardId: number, sid: number) => {
      abiertos.push([cardId, sid]);
    });
    act(() => {
      filaDelResumen(div)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(abiertos).toEqual([[1, 10]]);
    act(() => root.unmount());
  });
});
