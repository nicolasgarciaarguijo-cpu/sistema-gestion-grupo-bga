import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { SeccionMensual, type EmpresaSeccion } from "./SeccionMensual";
import { obligacionMensual, planDeObligacion, type DocObligacion } from "../domain/obligacionMensual";
import { esPagoDeIva } from "../domain/pagoDeIva";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 21/11/2026: "en el bloque solo quiero informacion numerica de cuanto iva vamos teniendo y vamos
// pagando mes a mes. Nada mas." / "todo esto preparalo en fichas" / "las fichas que se vinculan deben ser
// unicas": la boleta se abre en SU ficha (la factura de Compras) y el plan en la suya (Desendeudamiento).
const plan = planDeObligacion({ deudaId: 7, concepto: "Plan IVA septiembre", capital: 3000000, total: 3600000, cuotas: 6, cuotasPagadas: 2, pagado: 1200000, pendiente: 2400000 });
const docs: DocObligacion[] = [
  { id: 11, company: "De Raiz", supplier: "ARCA", fecha: "2026-11-25", total: 6940676, periodo: "2026-08" },
  { id: 12, company: "De Raiz", supplier: "ARCA", fecha: "2026-10-20", total: 3000000, periodo: "2026-09", plan },
];
const empresa = (): EmpresaSeccion => ({
  company: "De Raiz",
  short: "De Raíz",
  datos: obligacionMensual({
    company: "De Raiz",
    meses: [{ mes: "2026-08", calculado: 9255138 }, { mes: "2026-09", calculado: 3000000 }, { mes: "2026-10", calculado: 2000000 }],
    docs,
    hoy: "2026-11-21",
  }),
  extra: { "2026-08": { debito: 9255138, credito: 0 } },
  avisos: { "2026-08": "faltan cargar las facturas de compra" },
});

const pintar = (props: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() =>
    createRoot(div).render(
      <SeccionMensual
        titulo="IVA"
        nombreBoleta="VEP"
        nombreCalculado="A pagar (sistema)"
        empresas={[empresa()]}
        columnas={[{ clave: "debito", titulo: "IVA ventas" }, { clave: "credito", titulo: "IVA compras" }]}
        money={(n: number) => "$" + Math.round(n)}
        detalle={() => [{ titulo: "IVA ventas", total: 100, filas: [{ fecha: "2026-08-10", texto: "Factura 383", monto: 100 }] }]}
        onAbrirBoleta={() => {}}
        onCargarBoleta={() => {}}
        onAbrirPlan={() => {}}
        onSacarPlan={() => {}}
        {...props}
      />
    )
  );
  return div;
};
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const boton = (raiz: Element, texto: string) => Array.from(raiz.querySelectorAll("button")).find((b) => (b.textContent || "").includes(texto)) as HTMLButtonElement;

describe("SeccionMensual · el bloque", () => {
  it("es una tabla de numeros: un renglon por mes, sin ningun campo para tipear", () => {
    const div = pintar();
    expect(div.querySelectorAll("tr[data-mes]")).toHaveLength(3);
    expect(div.querySelectorAll("input, select, textarea")).toHaveLength(0);
    expect(div.textContent).not.toContain("PDF");
  });

  it("el contador de por pagar cuenta solo los meses sin VEP cargado", () => {
    // Agosto y septiembre ya tienen VEP: queda octubre.
    expect(pintar().querySelector("[data-por-pagar]")!.textContent).toBe("$2000000");
  });

  it("cada mes dice como se resolvio y la diferencia contra lo calculado", () => {
    const div = pintar();
    const fila = (m: string) => div.querySelector(`tr[data-mes="${m}"]`)!.textContent || "";
    expect(fila("2026-08")).toContain("cargado, sin pagar");
    expect(fila("2026-08")).toContain("$-2314462");
    expect(fila("2026-09")).toContain("plan de pago");
    expect(fila("2026-09")).toContain("coincide");
    expect(fila("2026-10")).toContain("falta cargar el VEP");
  });

  it("muestra la costumbre y los intereses de los planes", () => {
    const texto = pintar().textContent || "";
    expect(texto).toContain("0 mes(es) al contado · 1 en plan · 1 sin VEP");
    expect(texto).toContain("En planes: $3600000 · falta $2400000 · intereses $600000");
  });
});

describe("SeccionMensual · lo cargado es palabra santa", () => {
  it("un plan cargado sin comprobante elegido se muestra tal cual, sin reclamar el interes", () => {
    const sinCapital = planDeObligacion({ deudaId: 9, concepto: "Plan IVA", capital: 0, total: 4000000, cuotas: 8, cuotasPagadas: 0, pagado: 0, pendiente: 4000000 });
    const e = empresa();
    e.datos = obligacionMensual({ company: "De Raiz", meses: [{ mes: "2026-09", calculado: 3000000 }], docs: [{ ...docs[1], plan: sinCapital }], hoy: "2026-11-21" });
    const div = pintar({ empresas: [e] });
    click(div.querySelector('tr[data-mes="2026-09"]')!);
    const planEl = div.querySelector('[data-plan="9"]')!;
    expect(planEl.textContent).toContain("$4000000 en 8 cuota(s)");
    expect(planEl.textContent).not.toContain("no se puede calcular");
    expect(planEl.textContent).not.toContain("interés");
  });

  it("la diferencia con lo calculado no se pinta de alarma", () => {
    const div = pintar();
    const celdas = Array.from(div.querySelectorAll('tr[data-mes="2026-08"] td')) as HTMLElement[];
    const dif = celdas.find((c) => (c.textContent || "").includes("-2314462"))!;
    expect(dif.style.color).toBe("rgb(100, 116, 139)");
  });
});

describe("SeccionMensual · la ficha del mes", () => {
  it("el click en el mes abre su ficha, con el detalle y el aviso del mes", () => {
    const div = pintar();
    expect(div.querySelector("[data-ficha-mes]")).toBeNull();
    click(div.querySelector('tr[data-mes="2026-08"]')!);
    const ficha = div.querySelector('[data-ficha-mes="2026-08"]')!;
    expect(ficha.textContent).toContain("faltan cargar las facturas de compra");
    expect(ficha.textContent).toContain("Factura 383");
    // Lo cargado es palabra santa: la diferencia con lo calculado se informa, no se reclama.
    expect(ficha.querySelector("[data-cruce]")!.textContent).toContain("Lo que vale es lo cargado: $6940676");
    expect(ficha.querySelector("[data-cruce]")!.textContent).toContain("es solo informativo");
  });

  it("la boleta se abre en su ficha de siempre (la factura), no en una copia", () => {
    const onAbrirBoleta = jest.fn();
    const div = pintar({ onAbrirBoleta });
    click(div.querySelector('tr[data-mes="2026-08"]')!);
    click(boton(div.querySelector('[data-boleta="11"]')!, "Abrir la ficha"));
    expect(onAbrirBoleta).toHaveBeenCalledWith(11);
  });

  it("una boleta sin pagar ofrece sacar un plan; una que ya esta en plan muestra su evolucion y abre el plan", () => {
    const onSacarPlan = jest.fn();
    const onAbrirPlan = jest.fn();
    const div = pintar({ onSacarPlan, onAbrirPlan });
    click(div.querySelector('tr[data-mes="2026-08"]')!);
    click(boton(div, "Sacar un plan de pago"));
    expect(onSacarPlan).toHaveBeenCalled();
    click(boton(div, "Cerrar"));
    click(div.querySelector('tr[data-mes="2026-09"]')!);
    const planEl = div.querySelector('[data-plan="7"]')!;
    expect(planEl.textContent).toContain("2 de 6 cuota(s) pagas");
    expect(planEl.textContent).toContain("El plan cargado en Desendeudamiento: $3600000 en 6 cuota(s)");
    expect(planEl.textContent).toContain("interés $600000");
    expect(boton(div, "Sacar un plan de pago")).toBeUndefined();
    click(boton(planEl, "Abrir el plan"));
    expect(onAbrirPlan).toHaveBeenCalledWith(7);
  });

  it("cargar el VEP del mes pasa la empresa, el mes y lo calculado", () => {
    const onCargarBoleta = jest.fn();
    const div = pintar({ onCargarBoleta });
    click(div.querySelector('tr[data-mes="2026-10"]')!);
    click(boton(div, "Cargar VEP de 10/2026 a mano"));
    expect(onCargarBoleta).toHaveBeenCalledWith("De Raiz", "2026-10", 2000000);
  });
});

// El campo del periodo lo usa tambien la boleta del sindicato: no puede contarse como un pago del IVA.
describe("el periodo de una boleta del sindicato no es un VEP de IVA", () => {
  const f = { id: 1, company: "De Raiz", invoiceDate: "2026-11-05", total: 378093, ivaPeriodoMes: "2026-10", pagadaEl: "2026-11-05" };
  it("solo las facturas del fisco pagan el IVA", () => {
    expect(esPagoDeIva({ ...f, supplier: "USIMRA CABA" })).toBe(false);
    expect(esPagoDeIva({ ...f, supplier: "ARCA" })).toBe(true);
  });
});

// EL LECTOR DE PDF (21/11/2026): "o lo cargamos a mano o con el lector... tambien nos sirve para comprobar que
// no estamos cargando algo mal".
describe("SeccionMensual · el lector de PDF", () => {
  const elegirArchivo = async (div: Element) => {
    const input = div.querySelector("[data-leer-pdf]") as HTMLInputElement;
    const file = new File(["x"], "vep.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return file;
  };

  it("en un mes sin nada cargado ofrece leer el PDF, pasa la empresa y el mes, y muestra lo que devolvio", async () => {
    const onLeerPdf = jest.fn().mockResolvedValue("Leído: $2000000 · 10/2026.");
    const div = pintar({ onLeerPdf });
    click(div.querySelector('tr[data-mes="2026-10"]')!);
    expect(boton(div, "Leer el PDF del pago")).toBeTruthy();
    const file = await elegirArchivo(div);
    expect(onLeerPdf).toHaveBeenCalledWith("De Raiz", "2026-10", file);
    expect(div.querySelector("[data-lectura]")!.textContent).toBe("Leído: $2000000 · 10/2026.");
  });

  it("en un mes que ya tiene el pago cargado, el boton es para controlar", () => {
    const div = pintar({ onLeerPdf: jest.fn() });
    click(div.querySelector('tr[data-mes="2026-08"]')!);
    expect(boton(div, "Controlar con el PDF")).toBeTruthy();
    expect(boton(div, "Leer el PDF del pago")).toBeUndefined();
  });

  it("si el lector falla lo dice y manda a cargarlo a mano", async () => {
    const div = pintar({ onLeerPdf: jest.fn().mockRejectedValue(new Error("sin conexión")) });
    click(div.querySelector('tr[data-mes="2026-10"]')!);
    await elegirArchivo(div);
    expect(div.querySelector("[data-lectura]")!.textContent).toContain("No se pudo leer el PDF: sin conexión");
  });

  it("sin lector conectado no aparece el boton", () => {
    const div = pintar();
    click(div.querySelector('tr[data-mes="2026-10"]')!);
    expect(div.querySelector("[data-leer-pdf]")).toBeNull();
  });
});
