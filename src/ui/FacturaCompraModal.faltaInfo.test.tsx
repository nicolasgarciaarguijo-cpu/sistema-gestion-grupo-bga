import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FacturaCompraModal, type FacturaForm } from "./FacturaCompraModal";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 23/11/2026: "necesito que el sistema permita cargar un gasto con factura con informacion faltante, y que
// aclare que falta informacion [...] la vamos cargando como corresponde y despues completamos".
const base = (extra: Partial<FacturaForm> = {}): FacturaForm =>
  ({
    company: "BGA", supplier: "Proveedor SA", taxId: "", altaProveedor: false, receiptKind: "Factura", receiptLetter: "A", invoiceNumber: "",
    invoiceDate: "2026-11-20", net21: 0, vatRate: 21, exemptAmount: 0, vat: 0, otrosImpuestos: 0, iibb: 0, total: 50000,
    administration: "blanco", notes: "", pagos: [], saldo: { estadoPrevisto: "programado" }, ...extra,
  } as any);

const abrir = (f: FacturaForm, onGuardar = jest.fn()) => {
  const div = document.createElement("div");
  act(() =>
    createRoot(div).render(
      <FacturaCompraModal inicial={f} proveedores={[]} cuentas={[{ id: "bga-banco", company: "BGA", nombre: "Santander", moneda: "ARS" }]} companyOptions={[{ value: "BGA", short: "BGA" }]} renglonesEgreso={[]} pagosVinculables={() => []} fechaSegunCondicion={() => undefined} money={(n) => `$${n}`} onGuardar={onGuardar} onCerrar={() => {}} />
    )
  );
  return { div, onGuardar };
};
const guardar = (div: HTMLElement) => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Guardar factura") as HTMLButtonElement;

describe("factura con informacion faltante", () => {
  it("con proveedor, fecha y total ya se puede guardar, marcada y con la aclaracion de lo que falta", () => {
    const { div, onGuardar } = abrir(base());
    expect(div.querySelector("[data-falta-info-nota]")).toBeNull();
    act(() => (div.querySelector("[data-falta-info-check]") as HTMLInputElement).click());
    const nota = div.querySelector("[data-falta-info-nota]") as HTMLInputElement;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(nota, "se extravió, la mandan por mail");
      nota.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(guardar(div).disabled).toBe(false);
    act(() => guardar(div).click());
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ faltaInfo: true, faltaInfoNota: "se extravió, la mandan por mail", invoiceNumber: "", total: 50000 }));
  });

  it("al completarla se destilda y deja de avisar", () => {
    const { div, onGuardar } = abrir(base({ faltaInfo: true, faltaInfoNota: "falta el número" }));
    expect((div.querySelector("[data-falta-info-nota]") as HTMLInputElement).value).toBe("falta el número");
    act(() => (div.querySelector("[data-falta-info-check]") as HTMLInputElement).click());
    act(() => guardar(div).click());
    expect(onGuardar.mock.calls[0][0].faltaInfo).toBe(false);
  });
});
