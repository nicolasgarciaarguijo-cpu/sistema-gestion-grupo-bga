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
};

const render = (extra: any) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => { createRoot(host).render(<CalendarioAnualTab {...(base as any)} {...extra} />); });
  return host;
};

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
});
