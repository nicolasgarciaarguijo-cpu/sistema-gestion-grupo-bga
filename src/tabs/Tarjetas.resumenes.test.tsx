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

type Cb = {
  agregar?: () => void;
  quitar?: (id: number) => void;
  resumen?: (sid: number, campo: string, valor: any) => void;
  tarjeta?: (cardId: number, campo: string, valor: any) => void;
  quitarTarjeta?: (cardId: number) => void;
  impuestos?: any;
  pagados?: (g: any, pagado: boolean) => void;
};

const ficha = (cb: Cb = {}) =>
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
      onTarjeta={cb.tarjeta || (() => {})}
      onQuitarTarjeta={cb.quitarTarjeta}
      empresas={[{ value: "BGA", short: "BGA" }, { value: "De Raiz", short: "DR" }]}
      impuestosDelResumen={cb.impuestos}
      onImpuestosPagados={cb.pagados}
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
    // El de "Pagado", no el de "Activa" de los datos de la tarjeta.
    const chk = Array.from(div.querySelectorAll('input[type="checkbox"]')).find((c) => {
      const l = c.closest("label");
      return !!l && (l.textContent || "").includes("Todavía no");
    }) as HTMLInputElement;
    act(() => {
      chk.click();
    });
    expect(cambios).toContainEqual([10, "paid", true]);
    act(() => root.unmount());
  });

  it("la solapa ya no muestra el bloque de tarjetas", () => {
    const { div, root } = solapa();
    expect(div.querySelector('tr[title^="Click: abrir la ficha de la tarjeta"]')).toBeNull();
    expect(div.textContent).not.toContain("Agregar tarjeta");
    act(() => root.unmount());
  });

  it("los datos de la tarjeta se editan en la ficha", () => {
    const cambios: Array<[number, string, any]> = [];
    const { div, root } = ficha({ tarjeta: (id, campo, valor) => cambios.push([id, campo, valor]) });
    expect(div.textContent).toContain("Datos de la tarjeta");
    const banco = Array.from(div.querySelectorAll("input")).find((i) => (i as HTMLInputElement).defaultValue === "Santander") as HTMLInputElement;
    expect(banco).toBeTruthy();
    banco.value = "Patagonia";
    act(() => banco.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(cambios).toContainEqual([1, "bank", "Patagonia"]);
    act(() => root.unmount());
  });

  it("la empresa de la tarjeta sale de las opciones que se le pasan", () => {
    const { div, root } = ficha();
    const sel = Array.from(div.querySelectorAll("select")).find((x) => (x.textContent || "").includes("DR"))!;
    expect(sel).toBeTruthy();
    expect((sel as HTMLSelectElement).value).toBe("BGA");
    act(() => root.unmount());
  });

  it("la tarjeta se quita desde la ficha", () => {
    (window as any).confirm = () => true;
    const quitadas: number[] = [];
    const { div, root } = ficha({ quitarTarjeta: (id) => quitadas.push(id) });
    const btn = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Quitar la tarjeta")!;
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(quitadas).toEqual([1]);
    act(() => root.unmount());
  });

  // Nicolas, 25/11/2026: "primero saquemos la cajita [...] no quiero que genere ningun egreso".
  const grupoTarjeta = { clave: "tarjeta:10", origen: "tarjeta", company: "BGA", titulo: "Resumen octubre", banco: "Santander", moneda: "ARS", mes: "2026-10", fecha: "2026-11-10", total: 48000, porCategoria: { impuestos: 30000, comisiones: 18000, intereses: 0 }, lineas: [] };

  it("las comisiones de la tarjeta ya no tienen cajita de pago", () => {
    const tildados: Array<[string, boolean]> = [];
    const { div, root } = ficha({
      impuestos: () => ({ grupo: grupoTarjeta, pago: null, cuenta: { id: "c1", nombre: "Santander BGA $" } }),
      pagados: (g, pagado) => tildados.push([g.clave, pagado]),
    });
    expect(div.textContent).not.toContain("Sale de Santander BGA $");
    const chk = Array.from(div.querySelectorAll('input[type="checkbox"]')).find((c) => {
      const l = c.closest("label");
      return !!l && (l.textContent || "").includes("vence");
    });
    expect(chk).toBeUndefined();
    expect(div.querySelector("[data-pago-comisiones-viejo]")).toBeNull();
    expect(tildados).toEqual([]);
    act(() => root.unmount());
  });

  it("si quedó un pago hecho con la cajita vieja, avisa y deja quitarlo", () => {
    const tildados: Array<[string, boolean]> = [];
    const { div, root } = ficha({
      impuestos: () => ({ grupo: grupoTarjeta, pago: { fecha: "2026-11-10" }, cuenta: { id: "c1", nombre: "Santander BGA $" } }),
      pagados: (g, pagado) => tildados.push([g.clave, pagado]),
    });
    const aviso = div.querySelector("[data-pago-comisiones-viejo]") as HTMLElement;
    expect(aviso).toBeTruthy();
    expect(aviso.textContent).toContain("descuenta dos veces");
    act(() => (aviso.querySelector("button") as HTMLButtonElement).click());
    expect(tildados).toEqual([["tarjeta:10", false]]);
    act(() => root.unmount());
  });

  it("al lado de «Pagado» hay un monto pagado para cuando no fue el total", () => {
    const { div, root } = ficha();
    expect(div.querySelector("[data-monto-pagado]")).toBeTruthy();
    expect(div.textContent).toContain("Monto pagado $ (si no fue el total)");
    act(() => root.unmount());
  });
});
