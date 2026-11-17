import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FacturasCompraPanel, type FilaFactura } from "./FacturasCompra";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 17/11/2026: así apareció el IVA de agosto de De Raíz. Estaba cargado como una nota de débito de
// "ARCA" por $6.940.676 con vencimiento al 25/11, pero sin condición de pago no toma fecha prevista, así
// que NO ENTRABA AL CALENDARIO: plata que hay que pagar y no se ve venir. El aviso cuenta TODAS las impagas
// sin fecha, no solo las del mes que se está mirando.
const fila = (extra: Partial<FilaFactura> = {}): FilaFactura => ({
  id: 1,
  company: "De Raiz",
  supplier: "ARCA",
  taxId: "",
  receiptLetter: "X",
  invoiceNumber: "",
  invoiceDate: "2026-11-25",
  total: 6940676,
  administration: "blanco",
  source: "compras",
  pagada: false,
  pagoTexto: "",
  tipoProveedor: "nuevo",
  ...extra,
});

const render = (filas: FilaFactura[], onAbrir: any = () => {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <FacturasCompraPanel
        {...({
          filas,
          companyOptions: [{ value: "De Raiz", short: "De Raíz" }],
          money: (n: number) => "$" + Math.round(n),
          onNueva: () => {},
          onAbrir,
          onAsignarPago: () => {},
          onFichaProveedor: () => {},
          onEliminar: () => {},
          onImportarArca: async () => "",
        } as any)}
      />
    )
  );
  return { div, root };
};

describe("Facturas de ARCA sin el período de IVA", () => {
  it("avisa y el renglón abre la factura para cargarle el período", () => {
    const abiertas: number[] = [];
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() =>
      root.render(
        <FacturasCompraPanel
          {...({
            filas: [],
            companyOptions: [{ value: "De Raiz", short: "De Raíz" }],
            money: (n: number) => "$" + Math.round(n),
            onNueva: () => {},
            onAbrir: (id: number) => abiertas.push(id),
            onAsignarPago: () => {},
            onFichaProveedor: () => {},
            onEliminar: () => {},
            onImportarArca: async () => "",
            ivaSinPeriodo: [{ id: 7, company: "De Raiz", supplier: "ARCA", invoiceDate: "2026-11-25", total: 6940676 }],
          } as any)}
        />
      )
    );
    expect(div.textContent).toContain("sin el período de IVA");
    expect(div.textContent).toContain("$6940676");
    const boton = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").includes("ARCA · De Raíz"))!;
    act(() => {
      boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(abiertas).toEqual([7]);
    act(() => root.unmount());
  });
});

describe("Facturas impagas sin fecha de pago", () => {
  it("avisa el total y que no entran al Calendario", () => {
    const { div, root } = render([fila()]);
    expect(div.textContent).toContain("SIN FECHA DE PAGO");
    expect(div.textContent).toContain("$6940676");
    expect(div.textContent).toContain("no entran al Calendario");
    expect(div.textContent).toContain("ARCA");
    act(() => root.unmount());
  });

  it("cuenta las de cualquier mes, no solo el que se está mirando", () => {
    // La factura es de noviembre y el panel arranca en el mes actual; igual tiene que avisar.
    const { div, root } = render([fila({ invoiceDate: "2026-03-10" })]);
    expect(div.textContent).toContain("SIN FECHA DE PAGO");
    act(() => root.unmount());
  });

  it("la factura con fecha prevista no aparece en el aviso", () => {
    const { div, root } = render([fila({ fechaPrevista: "2026-11-25" })]);
    expect(div.textContent).not.toContain("SIN FECHA DE PAGO");
    act(() => root.unmount());
  });

  it("la pagada tampoco", () => {
    const { div, root } = render([fila({ pagada: true })]);
    expect(div.textContent).not.toContain("SIN FECHA DE PAGO");
    act(() => root.unmount());
  });

  it("el renglón del aviso abre la factura para elegirle la fecha", () => {
    const abiertas: number[] = [];
    const { div, root } = render([fila()], (id: number) => abiertas.push(id));
    // Ojo: el boton de importar el listado de ARCA tambien dice "ARCA"; el del aviso dice "factura del".
    const boton = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").includes("factura del"))!;
    act(() => {
      boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(abiertas).toEqual([1]);
    act(() => root.unmount());
  });
});
