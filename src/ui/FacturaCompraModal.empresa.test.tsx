import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FacturaCompraModal, type FacturaForm } from "./FacturaCompraModal";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const inicial = (pagos: any[]): FacturaForm =>
  ({
    company: "BGA",
    supplier: "Proveedor SA",
    taxId: "",
    altaProveedor: false,
    receiptKind: "Factura",
    receiptLetter: "A",
    invoiceNumber: "1",
    invoiceDate: "2026-11-10",
    net21: 1000,
    vatRate: 21,
    exemptAmount: 0,
    vat: 210,
    otrosImpuestos: 0,
    iibb: 0,
    total: 1210,
    administration: "blanco",
    notes: "",
    pagos,
    saldo: { estadoPrevisto: "programado" },
  } as any);

const pago = (extra: any = {}) => ({ key: "p1", fecha: "2026-11-10", monto: 1210, metodo: "transferencia", cuentaId: "bga-banco", administration: "blanco", ...extra });

const abrir = (f: FacturaForm) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <FacturaCompraModal
        inicial={f}
        proveedores={[]}
        cuentas={[
          { id: "bga-banco", company: "BGA", nombre: "Santander", moneda: "ARS" },
          { id: "dr-banco", company: "DR", nombre: "Galicia", moneda: "ARS" },
        ]}
        companyOptions={[{ value: "BGA", short: "BGA" }, { value: "DR", short: "De Raíz" }]}
        renglonesEgreso={[]}
        pagosVinculables={() => []}
        fechaSegunCondicion={() => undefined}
        money={(n) => `$${n}`}
        onGuardar={() => {}}
        onCerrar={() => {}}
      />
    )
  );
  const empresa = div.querySelector("select") as HTMLSelectElement; // el primero es la empresa de la factura
  const cambiar = (valor: string) =>
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
      setter.call(empresa, valor);
      empresa.dispatchEvent(new Event("change", { bubbles: true }));
    });
  return { div, empresa, cambiar };
};

describe("factura de compra: cambiar la empresa", () => {
  it("el pago de la empresa de la factura pierde la cuenta de la otra y hay que volver a elegirla", () => {
    const { div, empresa, cambiar } = abrir(inicial([pago()]));
    expect(empresa.value).toBe("BGA");
    expect(div.textContent).not.toContain("la cuenta de cada pago");
    cambiar("DR");
    expect(div.textContent).toContain("la cuenta de cada pago");
  });

  it("un pago cruzado (lo paga la otra empresa) conserva su cuenta", () => {
    const { div, cambiar } = abrir(inicial([pago({ empresa: "DR", cuentaId: "dr-banco" })]));
    cambiar("DR");
    expect(div.textContent).not.toContain("la cuenta de cada pago");
  });
});
