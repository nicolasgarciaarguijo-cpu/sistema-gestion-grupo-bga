// PLANILLA SOLO PARA VER (Nicolas, 2026-10-17): "el cash flow muestra lo que se edita en el resto del
// sistema, pero no permite edicion". Se prueba que el click derecho ya no ofrece cargar, editar, borrar
// ni mover, que el click en una celda vacia no abre la carga, y que dice DONDE se edita.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CalendarioAnualTab } from "./CalendarioAnual";
import { CALENDAR_SECTIONS, DEFAULT_CALENDAR_ROW_CONFIG } from "../domain/calendarStructure";

(Element.prototype as any).scrollIntoView = () => {};
(Element.prototype as any).scrollTo = () => {};

const hoy = new Date();
const anioFiscal = hoy.getMonth() + 1 >= 11 ? hoy.getFullYear() : hoy.getFullYear() - 1;
const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const seccion = CALENDAR_SECTIONS.find((s) => s.items.length > 0 && !s.dynamic)!;
const item = seccion.items[0];

const base = {
  entries: [
    {
      id: "cost-1", date: iso, amount: 100000, type: "egreso", status: "realizado",
      company: "BGA", administration: "blanco", conceptKey: item.key, title: item.label, currency: "ARS",
    },
  ],
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
  onRowConfigChange: () => {},
  onEditEntry: () => true,
  onDeleteEntry: () => true,
};

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

const clickDerecho = (el: Element) =>
  act(() => { el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); });
const botones = () => Array.from(document.querySelectorAll("button")).map((b) => b.textContent || "");
const filaDelRenglon = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("tr")).find((tr) => (tr.querySelector("td")?.textContent || "").includes(item.label))!;
const celdaConMonto = (host: HTMLElement) =>
  Array.from(filaDelRenglon(host).querySelectorAll("td")).find((td) => (td.textContent || "").includes("100000"))!;

describe("planilla solo para ver", () => {
  it("sin soloLectura, el click derecho sigue ofreciendo editar (control)", () => {
    const host = render({});
    clickDerecho(celdaConMonto(host));
    expect(botones().some((t) => t.includes("Editar"))).toBe(true);
    expect(botones().some((t) => t.includes("Cargar acá"))).toBe(true);
  });

  it("con soloLectura: no se carga, edita, borra ni mueve, y dice dónde se edita", () => {
    const host = render({ soloLectura: true });
    clickDerecho(celdaConMonto(host));
    const t = botones();
    for (const no of ["Editar", "Borrar movimiento", "Cargar acá", "Mover a", "Cambiar a"]) {
      expect(t.some((x) => x.includes(no))).toBe(false);
    }
    expect(document.body.textContent).toContain("Pago a proveedores");
    expect(document.body.textContent).toContain("solo para ver");
  });

  it("con soloLectura: click en una celda vacía no abre la carga y no hay '+ sección' ni '+ renglón'", () => {
    const host = render({ soloLectura: true });
    const vacia = Array.from(filaDelRenglon(host).querySelectorAll("td")).find(
      (td) => (td.textContent || "").trim() === "+"
    )!;
    expect(vacia).toBeTruthy();
    const antes = host.querySelectorAll("input").length;
    act(() => { vacia.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(document.body.querySelectorAll("input").length).toBe(antes);
    expect(botones().some((x) => x.includes("+ sección"))).toBe(false);
    expect(botones().some((x) => x.includes("+ renglón"))).toBe(false);
  });
});
