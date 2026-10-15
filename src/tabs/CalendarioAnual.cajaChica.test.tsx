// Un gasto rendido de caja chica TIENE que llegar a la planilla, en EGRESOS · PROVEEDORES, en el dia
// del gasto y con el nombre del proveedor (caso real: caja de Lucas, 14/10/2026).
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CalendarioAnualTab } from "./CalendarioAnual";
import { DEFAULT_CALENDAR_ROW_CONFIG } from "../domain/calendarStructure";
import { aRenglonDeProveedores, claveGrupo } from "../domain/gruposProveedores";

(Element.prototype as any).scrollIntoView = () => {};
(Element.prototype as any).scrollTo = () => {};

const gasto = {
  id: "petty-cash-1",
  date: "2026-10-14",
  company: "De raiz s.r.l",
  title: "Juan carlos Barsi",
  kind: "caja-chica",
  amount: 7037.05,
  statusLabel: "Caja blanca",
  administration: "blanco",
} as any;

it("el gasto de caja chica cae en Proveedores, en su grupo y en su dia", () => {
  const r = aRenglonDeProveedores(gasto, () => undefined, {
    proveedor: "Juan carlos Barsi",
    grupoDelPago: claveGrupo("variable", "Compras y materiales"),
  } as any);
  expect(r?.conceptKey).toBe("prov:proveedores_out:variable|Compras y materiales");
  const entrada = { ...gasto, conceptKey: r!.conceptKey, title: r!.title };

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <CalendarioAnualTab
        {...({
          entries: [entrada],
          companyScope: "__ALL__",
          setCompanyScope: () => {},
          fiscalStartYear: 2025,
          setFiscalStartYear: () => {},
          fiscalYearOptions: [{ value: 2025, label: "2025" }],
          companyOptions: [{ value: "De raiz s.r.l", short: "De Raíz", primary: "#7c4a1e", soft: "#f5e9dc" }],
          onAddMovement: () => {},
          onAssignConcept: () => {},
          bnaCompra: 1,
          money: (n: number) => String(n),
          rowConfig: DEFAULT_CALENDAR_ROW_CONFIG,
          gruposCosto: [{ clave: "variable|Compras y materiales", nombre: "Compras y materiales", tipo: "variable" }],
        } as any)}
      />
    );
  });
  expect(host.textContent).toContain("Juan carlos Barsi");
  expect(host.textContent).toContain("7037.05");
  act(() => root.unmount());
  host.remove();
});
