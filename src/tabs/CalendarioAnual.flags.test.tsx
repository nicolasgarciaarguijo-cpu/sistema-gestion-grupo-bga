// La celda marcada TIENE que verse. Esta marca no se dibujo bien cuatro veces seguidas (glifo
// invisible, box-shadow tapado por el borderCollapse, y celdas que directamente no chequeaban si
// estaban marcadas), asi que el dibujo se verifica aca y no a ojo en produccion.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CalendarioAnualTab } from "./CalendarioAnual";
import { CALENDAR_SECTIONS, DEFAULT_CALENDAR_ROW_CONFIG } from "../domain/calendarStructure";

// jsdom no implementa scrollIntoView y el calendario lo usa para centrarse en el dia de hoy.
(Element.prototype as any).scrollIntoView = () => {};
// jsdom tampoco implementa scrollTo, y el calendario lo usa para llevar la planilla al mes elegido.
(Element.prototype as any).scrollTo = () => {};

const hoy = new Date();
// El ejercicio arranca en NOVIEMBRE: si hoy es antes de noviembre, el año fiscal que contiene a hoy
// es el que empezo el año pasado. Sin esto el dia de hoy cae fuera de las columnas y no se dibuja.
const anioFiscal = hoy.getMonth() + 1 >= 11 ? hoy.getFullYear() : hoy.getFullYear() - 1;
const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

const seccion = CALENDAR_SECTIONS.find((s) => s.items.length > 0 && !s.dynamic)!;
const item = seccion.items[0];
const clave = `${seccion.key}|${item.key}|${iso}`;

const entrada = {
  id: "e1", date: iso, amount: 100000, type: "egreso", status: "realizado",
  company: "BGA", administration: "blanco", conceptKey: item.key, title: item.label,
  currency: "ARS",
} as any;

const base = {
  entries: [entrada],
  companyScope: "__ALL__",
  setCompanyScope: () => {},
  fiscalStartYear: anioFiscal,
  setFiscalStartYear: () => {},
  fiscalYearOptions: [{ value: anioFiscal, label: String(anioFiscal) }],
  companyOptions: [{ value: "BGA", short: "BGA", primary: "#14213d", soft: "#dbe7f7" }],
  onAddMovement: () => {},
  onAssignConcept: () => {},
  bnaCompra: 1,
  money: (n: number) => String(n),
  rowConfig: DEFAULT_CALENDAR_ROW_CONFIG,
  jobs: [{ id: 7, budgetNumber: "3199", client: "RICARDO GRANILLO", company: "BGA", active: true }],
};

// Los tests montan la planilla ENTERA (un año de columnas por cada renglon): si no se desmonta,
// diez tests dejan diez copias vivas y el proceso se queda sin memoria.
const montados: Array<{ host: HTMLElement; root: ReturnType<typeof createRoot> }> = [];
const render = (extra: any) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(<CalendarioAnualTab {...(base as any)} {...extra} />); });
  montados.push({ host, root });
  return host;
};
afterEach(() => {
  while (montados.length) {
    const m = montados.pop()!;
    act(() => { m.root.unmount(); });
    m.host.remove();
  }
});

describe("la celda marcada se ve", () => {
  it("el renglón se dibuja (si no, el resto de los tests no probaría nada)", () => {
    const host = render({ flags: [] });
    expect(host.querySelectorAll("td").length).toBeGreaterThan(0);
    expect(host.textContent).toContain(item.label);
  });

  it("sin marcar no hay recuadro rojo", () => {
    const host = render({ flags: [] });
    // Acotado a las celdas: el rojo tambien vive en la leyenda y en el dibujo de la bandera.
    const conRecuadro = Array.from(host.querySelectorAll("td")).filter((td) =>
      (td as HTMLElement).style.outline.includes("#dc2626")
    );
    expect(conRecuadro).toHaveLength(0);
  });

  it("marcada: recuadro rojo y bandera dibujada en la celda", () => {
    const host = render({
      flags: [{ id: 1, key: clave, date: iso, label: item.label, note: "", createdBy: "Nico", createdAt: "" }],
    });
    const celdas = Array.from(host.querySelectorAll("td")).filter(
      (td) => (td as HTMLElement).style.outline.includes("#dc2626")
    );
    expect(celdas.length).toBeGreaterThan(0);
    // Y adentro de esa misma celda tiene que estar la bandera (el SVG), no solo el borde.
    const conBandera = celdas.find((td) => td.querySelector("svg"))!;
    expect(conBandera).toBeTruthy();
    // La celda mide 56px con overflow:hidden y el numero va a la derecha: si la bandera estuviera en
    // el flujo empujaria el contenido y se cortaria afuera. Tiene que ir posicionada.
    const marca = conBandera.querySelector("span[style*='absolute']");
    expect(marca).toBeTruthy();
    expect(conBandera.textContent).toContain("100000");
  });

  it("un marcador de color pinta el borde de su color, sin tocar el fondo", () => {
    const host = render({
      marks: [{ id: 1, key: clave, date: iso, label: item.label, color: "naranja", createdBy: "Nico", createdAt: "" }],
    });
    const celdas = Array.from(host.querySelectorAll("td")).filter(
      (td) => (td as HTMLElement).style.outline.includes("#ea580c")
    );
    expect(celdas.length).toBeGreaterThan(0);
  });

  // MOVER UN MONTO. Dos clicks derechos: uno agarra, el otro suelta. Se prueba entero porque el
  // pedido de Nicolas fue justamente que el segundo paso no le aparecia.
  it("botón derecho ofrece 'Mover a…', y después el destino ofrece 'Mover aquí'", () => {
    const movidos: any[] = [];
    const host = render({ onEditEntry: (id: string, patch: any) => { movidos.push({ id, patch }); return true; } });

    const clickDerecho = (el: Element) => {
      act(() => {
        el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      });
    };
    const botonQueDice = (txt: string) =>
      Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes(txt));

    // OJO: hay que agarrar la celda DEL RENGLON, no la del total de la seccion (que tiene el mismo
    // numero y aparece antes en el DOM).
    const filaDelRenglon = Array.from(host.querySelectorAll("tr")).find((tr) =>
      (tr.querySelector("td")?.textContent || "").includes(item.label)
    )!;
    const celdaConMonto = Array.from(filaDelRenglon.querySelectorAll("td")).find((td) =>
      (td.textContent || "").includes("100000")
    )!;
    expect(celdaConMonto).toBeTruthy();

    clickDerecho(celdaConMonto);
    const mover = botonQueDice("Mover a");
    expect(mover).toBeTruthy();
    act(() => { mover!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    // Ahora un casillero distinto: tiene que ofrecer soltar ahi.
    const otraCelda = Array.from(filaDelRenglon.querySelectorAll("td")).find(
      (td) => td !== celdaConMonto && !(td.textContent || "").includes("100000") && !(td.textContent || "").includes(item.label)
    )!;
    clickDerecho(otraCelda);
    const soltar = botonQueDice("Mover aquí");
    expect(soltar).toBeTruthy();

    act(() => { soltar!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(movidos).toHaveLength(1);
    expect(movidos[0].patch.conceptKey).toBe(item.key);
  });

  // EL CASO REAL: mover a OTRO RENGLON (no a otro dia del mismo). Es para lo que sirve la funcion:
  // algo quedo clasificado en el renglon equivocado.
  it("se puede mover a un renglón distinto", () => {
    const movidos: any[] = [];
    const host = render({ onEditEntry: (id: string, patch: any) => { movidos.push({ id, patch }); return true; } });
    const clickDerecho = (el: Element) => {
      act(() => { el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); });
    };
    const botonQueDice = (txt: string) =>
      Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes(txt));

    const filaOrigen = Array.from(host.querySelectorAll("tr")).find((tr) =>
      (tr.querySelector("td")?.textContent || "").includes(item.label)
    )!;
    const celdaOrigen = Array.from(filaOrigen.querySelectorAll("td")).find((td) =>
      (td.textContent || "").includes("100000")
    )!;
    clickDerecho(celdaOrigen);
    act(() => { botonQueDice("Mover a")!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    // Otro renglón cualquiera de la misma sección.
    const otroItem = seccion.items[1] || seccion.items[0];
    const filaDestino = Array.from(host.querySelectorAll("tr")).find((tr) =>
      (tr.querySelector("td")?.textContent || "").includes(otroItem.label) && tr !== filaOrigen
    )!;
    expect(filaDestino).toBeTruthy();
    const celdaDestino = Array.from(filaDestino.querySelectorAll("td"))[5];
    clickDerecho(celdaDestino);
    // eslint-disable-next-line no-console
    console.log("MENU EN DESTINO:", Array.from(document.querySelectorAll("button")).slice(-4).map((b) => (b.textContent || "").slice(0, 45)).join(" | "));
    const soltar = botonQueDice("Mover aquí");
    expect(soltar).toBeTruthy();
    // Y tiene que ser lo PRIMERO del menu: el menu tiene alto maximo con scroll interno, asi que lo
    // que queda al final no se ve. Este era el bug: la opcion existia y estaba cortada abajo.
    const menu = soltar!.closest("div[style*='fixed']")!;
    expect(Array.from(menu.querySelectorAll("button")).indexOf(soltar!)).toBe(0);
  });

  // LA PLANILLA Y EL TRABAJO SON EL MISMO DATO. Si se carga una cobranza eligiendo el trabajo, tiene
  // que escribirse COMO PAGO DEL TRABAJO y no como un movimiento suelto del calendario: si se
  // hicieran las dos cosas, el mismo peso quedaria contado dos veces.
  it("una cobranza con trabajo elegido se carga como pago del trabajo, no como movimiento suelto", () => {
    const pagos: any[] = [];
    const sueltos: any[] = [];
    const host = render({
      companyScope: "BGA",
      onAddJobPayment: (ppto: string, pay: any) => { pagos.push({ ppto, pay }); return true; },
      onAddMovement: (m: any) => { sueltos.push(m); },
    });

    const boton = Array.from(host.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("cargar cobranza")
    )!;
    expect(boton).toBeTruthy();
    act(() => { boton.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    const selects = Array.from(document.querySelectorAll("select"));
    const selTrabajo = selects.find((sel) =>
      Array.from(sel.options).some((o) => o.textContent?.includes("3199"))
    )!;
    expect(selTrabajo).toBeTruthy();
    const setSel = (el: HTMLSelectElement, v: string) => {
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
        setter.call(el, v);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };
    setSel(selTrabajo, "3199");

    const selComo = Array.from(document.querySelectorAll("select")).find((sel) =>
      Array.from(sel.options).some((o) => o.value === "efectivo")
    )!;
    expect(selComo).toBeTruthy();
    setSel(selComo, "efectivo");

    const inputMonto = Array.from(document.querySelectorAll("input")).find((i) => i.type === "number")!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(inputMonto, "50000");
      inputMonto.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const guardar = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Guardar en el sistema")
    )!;
    expect(guardar).toBeTruthy();
    expect((guardar as HTMLButtonElement).disabled).toBe(false);
    act(() => { guardar.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(pagos).toHaveLength(1);
    expect(pagos[0].ppto).toBe("3199");
    expect(pagos[0].pay.amount).toBe(50000);
    expect(pagos[0].pay.transactionType).toBe("efectivo");
    // Y NO se creo ademas un movimiento suelto: seria el mismo peso contado dos veces.
    expect(sueltos).toHaveLength(0);
  });

  // AGREGAR UN RENGLON NO PUEDE BORRAR LAS SECCIONES. Cada funcion armaba la config a mano y se
  // olvidaba de `sections`: agregar un renglon te borraba todas las secciones propias.
  it("agregar un renglón conserva las secciones propias", () => {
    const guardados: any[] = [];
    const config = {
      labels: {},
      hidden: [],
      extra: [],
      sections: [{ key: "propia:obra", label: "OBRA", dir: "out" as const }],
    };
    const host = render({
      rowConfig: config,
      onRowConfigChange: (c: any) => guardados.push(c),
    });

    const mas = Array.from(host.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("+ renglón")
    )!;
    expect(mas).toBeTruthy();
    act(() => { mas.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    // Ya no es un window.prompt: es un cuadro nuestro. Se busca DENTRO del cuadro, que es el que
    // tiene el botón Guardar (la planilla tiene sus propios inputs por todos lados).
    const guardar = Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim() === "Guardar"
    )!;
    expect(guardar).toBeTruthy();
    let cuadro: HTMLElement = guardar.parentElement!;
    while (cuadro && !cuadro.querySelector("input")) cuadro = cuadro.parentElement!;
    const input = cuadro.querySelector("input")!;
    expect(input).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Fletes especiales");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => { guardar.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(guardados).toHaveLength(1);
    expect(guardados[0].extra).toEqual([{ sectionKey: expect.any(String), label: "Fletes especiales" }]);
    // Lo importante: la sección propia sigue viva.
    expect(guardados[0].sections).toEqual([{ key: "propia:obra", label: "OBRA", dir: "out" }]);
  });

  // BGA opera con DOS bancos. Sumados no se sabe de cual hay plata, que es lo que hace falta para
  // decidir un pago: va una fila por cuenta.
  it("cada banco tiene su propia fila, y los totales ya no están inmovilizados", () => {
    const dia = {
      banco: 3500,
      bancos: [{ bank: "Santander", saldo: 1000 }, { bank: "Patagonia", saldo: 2500 }],
      efectivoBlanco: 700,
      efectivoNegro: 300,
    };
    const host = render({
      billeteraDiaria: [
        { company: "BGA", short: "BGA", color: "#14213d", soft: "#dbe7f7", byDay: { [iso]: dia } },
      ],
    });
    const etiquetas = Array.from(host.querySelectorAll("td")).map((td) => (td.textContent || "").trim());
    expect(etiquetas).toContain("BGA · Santander");
    expect(etiquetas).toContain("BGA · Patagonia");
    expect(etiquetas).toContain("BGA · Efectivo blanco");

    // Cada fila muestra el saldo DE SU cuenta, no el total.
    const filaSantander = Array.from(host.querySelectorAll("tr")).find((tr) =>
      (tr.querySelector("td")?.textContent || "").includes("Santander")
    )!;
    expect(filaSantander.textContent).toContain("1000");
    expect(filaSantander.textContent).not.toContain("3500");

    // Los totales quedaron fuera del encabezado fijo (van en el cuerpo, debajo de los netos).
    const thead = host.querySelector("thead")!;
    const tbody = host.querySelector("tbody")!;
    expect(thead.textContent).toContain("NETO DÍA");
    expect(thead.textContent).not.toContain("TOTAL INGRESOS");
    expect(tbody.textContent).toContain("TOTAL INGRESOS");
  });

  // LA FACTURA SE VE PERO NO SUMA. La plata se mueve con el cobro y con el pago; si la factura
  // sumara, cada peso quedaria contado dos veces. Este test es el que impide que eso vuelva.
  it("las facturas figuran en la planilla y NO cambian los totales", () => {
    const factura = {
      id: "financial-99", date: iso, amount: 250000, type: "facturacion", status: "realizado",
      company: "BGA", administration: "blanco", conceptKey: "__facturacion__",
      title: "Venta · CONTRACT RENT", currency: "ARS",
    } as any;

    const sinFactura = render({});
    const conFactura = render({ entries: [entrada, factura] });

    // Se ve: el bloque y el renglón de la factura.
    expect(conFactura.textContent).toContain("FACTURACIÓN");
    expect(conFactura.textContent).toContain("Venta · CONTRACT RENT");
    expect(sinFactura.textContent).not.toContain("FACTURACIÓN");

    // Y no suma: la fila de TOTAL EGRESOS tiene que decir exactamente lo mismo en los dos casos.
    const totalDe = (host: HTMLElement, etiqueta: string) => {
      const fila = Array.from(host.querySelectorAll("tr")).find((tr) =>
        (tr.querySelector("td")?.textContent || "").includes(etiqueta)
      );
      return fila ? (fila.textContent || "").replace(etiqueta, "") : "";
    };
    expect(totalDe(conFactura, "TOTAL EGRESOS")).toBe(totalDe(sinFactura, "TOTAL EGRESOS"));
    expect(totalDe(conFactura, "TOTAL INGRESOS")).toBe(totalDe(sinFactura, "TOTAL INGRESOS"));
    expect(totalDe(conFactura, "NETO DÍA · BLANCO")).toBe(totalDe(sinFactura, "NETO DÍA · BLANCO"));
  });
});
