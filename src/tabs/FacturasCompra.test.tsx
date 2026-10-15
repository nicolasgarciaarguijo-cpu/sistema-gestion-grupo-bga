// Las facturas se editan y se eliminan desde el CLICK DERECHO de la fila (regla del sistema).
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FacturasCompraPanel, FilaFactura } from "./FacturasCompra";

const mes = new Date().toISOString().slice(0, 7);
const fila = (extra: Partial<FilaFactura>): FilaFactura => ({
  id: 1, company: "De raiz s.r.l", supplier: "Proveedor de prueba", taxId: "", receiptLetter: "A",
  invoiceNumber: "0001", invoiceDate: `${mes}-05`, total: 1000, administration: "blanco", source: "compras",
  pagada: false, pagoTexto: "", tipoProveedor: "habitual", ...extra,
});

const montar = (filas: FilaFactura[], onEliminar: jest.Mock, onAbrir = jest.fn()) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <FacturasCompraPanel filas={filas} companyOptions={[]} money={(n) => String(n)} onNueva={() => {}}
        onAbrir={onAbrir} onAsignarPago={() => {}} onFichaProveedor={() => {}} onEliminar={onEliminar} />
    );
  });
  const tr = Array.from(host.querySelectorAll("tbody tr"))[0] as HTMLElement;
  act(() => { tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 })); });
  const boton = (texto: string) => Array.from(document.querySelectorAll("button")).find((b) => b.textContent === texto) as HTMLButtonElement;
  return { host, root, boton };
};

afterEach(() => { document.body.innerHTML = ""; jest.restoreAllMocks(); });

it("eliminar una factura sin pago", () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  const onEliminar = jest.fn();
  const { boton, root } = montar([fila({})], onEliminar);
  act(() => { boton("Eliminar factura").click(); });
  expect(onEliminar).toHaveBeenCalledWith(1, false);
  act(() => root.unmount());
});

it("una factura de prueba con pago se puede eliminar junto con el pago", () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  const onEliminar = jest.fn();
  const { boton, root } = montar([fila({ pagada: true, tienePagoCargado: true })], onEliminar);
  act(() => { boton("Eliminar factura y su pago").click(); });
  expect(onEliminar).toHaveBeenCalledWith(1, true);
  act(() => root.unmount());
});

it("editar abre la factura, y si se cancela la confirmacion no se borra nada", () => {
  jest.spyOn(window, "confirm").mockReturnValue(false);
  const onEliminar = jest.fn();
  const onAbrir = jest.fn();
  const { boton, root } = montar([fila({})], onEliminar, onAbrir);
  act(() => { boton("Eliminar factura").click(); });
  expect(onEliminar).not.toHaveBeenCalled();
  const tr = document.querySelector("tbody tr") as HTMLElement;
  act(() => { tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 })); });
  act(() => { boton("Editar factura…").click(); });
  expect(onAbrir).toHaveBeenCalledWith(1);
  act(() => root.unmount());
});
