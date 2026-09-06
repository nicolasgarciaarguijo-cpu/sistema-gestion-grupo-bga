// LA PREVISION NO ES PLATA. Los seguros dejan en la planilla lo que se VIENE a debitar, y eso no
// puede confundirse con un gasto ya hecho ni sumarse a el: se dibuja "≈" mientras no cayo el debito,
// y cuando cae manda el numero real. Que las dos cosas nunca se vean juntas es lo que evita que el
// mismo seguro se cuente dos veces, asi que se verifica aca y no a ojo en produccion.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CalendarioAnualTab } from "./CalendarioAnual";
import { DEFAULT_CALENDAR_ROW_CONFIG } from "../domain/calendarStructure";

(Element.prototype as any).scrollIntoView = () => {};
(Element.prototype as any).scrollTo = () => {};

const hoy = new Date();
const anioFiscal = hoy.getMonth() + 1 >= 11 ? hoy.getFullYear() : hoy.getFullYear() - 1;
const y = hoy.getFullYear();
const m = String(hoy.getMonth() + 1).padStart(2, "0");
// El dia 5 y el 20 del mes de hoy: la prevision cae en uno y el debito real en el otro, para probar
// que la conciliacion es POR MES (el dia de debito es una estimacion, no una promesa).
const diaPrevisto = `${y}-${m}-05`;
const diaReal = `${y}-${m}-20`;

const RENGLON = "seg_vehiculo";

const prevision = {
  conceptKey: RENGLON,
  company: "BGA",
  date: diaPrevisto,
  amount: 5000,
  tipo: "Vehículo",
  descripcion: "Fiat Fiorino",
};

const debitoReal = {
  id: "bank-1", date: diaReal, amount: 5000, kind: "banco", statusLabel: "debito",
  company: "BGA", administration: "blanco", conceptKey: RENGLON, title: "Seguro vehículo",
  currency: "ARS",
} as any;

const base = {
  entries: [],
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
    const m2 = montados.pop()!;
    act(() => { m2.root.unmount(); });
    m2.host.remove();
  }
});

const celdas = (host: HTMLElement) => Array.from(host.querySelectorAll("td"));

describe("la previsión de seguros en la planilla", () => {
  it("sin débito todavía, se ve el ≈ en el día previsto", () => {
    const host = render({ previsiones: [prevision] });
    const conPrevision = celdas(host).filter((td) => (td.textContent || "").includes("≈ 5000"));
    expect(conPrevision).toHaveLength(1);
    // En gris y en cursiva: no puede leerse como plata que ya se movió.
    expect((conPrevision[0] as HTMLElement).style.fontStyle).toBe("italic");
  });

  it("cuando cae el débito del mes, la previsión desaparece y queda el número real con ✓", () => {
    const host = render({ previsiones: [prevision], entries: [debitoReal] });
    expect(host.textContent).not.toContain("≈ 5000");
    const conTilde = celdas(host).filter((td) => (td.textContent || "").includes("✓"));
    expect(conTilde).toHaveLength(1);
    expect(conTilde[0].textContent).toContain("5000");
  });

  it("un débito por otro monto no la da por conciliada (no aparece el ✓)", () => {
    const host = render({ previsiones: [prevision], entries: [{ ...debitoReal, amount: 3000 }] });
    expect(host.textContent).not.toContain("✓");
  });

  it("la previsión de otra empresa no se cuela cuando se mira una sola", () => {
    const host = render({ previsiones: [{ ...prevision, company: "De Raíz" }], companyScope: "BGA" });
    expect(host.textContent).not.toContain("≈ 5000");
  });

  it("sin previsiones la planilla se dibuja igual que siempre", () => {
    const host = render({});
    expect(celdas(host).length).toBeGreaterThan(0);
    expect(host.textContent).not.toContain("≈");
  });
});
