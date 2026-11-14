import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FacturaCompraModal, type FacturaForm } from "./FacturaCompraModal";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 2026-11-14: arriba de todo, de que empresa es TODO esto. Tres cosas dicen su empresa (el
// proveedor, la factura y cada pago); si no coinciden, la ficha lo marca como CRUCE / DESVIO y ese monto
// va a la cuenta corriente entre las empresas. El cruce se detecta solo y tambien se puede forzar.
const inicial = (pagos: any[], extra: any = {}): FacturaForm =>
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
    ...extra,
  } as any);

const pago = (extra: any = {}) => ({ key: "p1", fecha: "2026-11-10", monto: 1210, metodo: "transferencia", cuentaId: "bga-banco", administration: "blanco", ...extra });

const PROVEEDORES = [
  { id: 1, name: "Proveedor SA", taxId: "", company: "BGA" },
  { id: 2, name: "Compartido SA", taxId: "", company: "General" },
  { id: 3, name: "De la otra SA", taxId: "", company: "DR" },
];

const abrir = (f: FacturaForm) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <FacturaCompraModal
        inicial={f}
        proveedores={PROVEEDORES as any}
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
  const arriba = div.querySelector("select") as HTMLSelectElement; // el primero es el de arriba de todo
  const elegirArriba = (valor: string) =>
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
      setter.call(arriba, valor);
      arriba.dispatchEvent(new Event("change", { bubbles: true }));
    });
  return { div, arriba, elegirArriba, root };
};

describe("de qué empresa es todo esto (cruce / desvío)", () => {
  it("sin cruce, arriba dice la empresa y lo aclara", () => {
    const { div, arriba, root } = abrir(inicial([pago()]));
    expect(arriba.value).toBe("BGA");
    expect(div.textContent).toContain("La factura, el pago y el proveedor son de la misma empresa");
    expect(div.textContent).not.toContain("Préstamo entre empresas");
    act(() => root.unmount());
  });

  it("las tres dicen de quién son", () => {
    const { div, root } = abrir(inicial([pago()]));
    expect(div.textContent).toContain("Proveedor de:");
    expect(div.textContent).toContain("La factura es de:");
    expect(div.textContent).toContain("El pago sale de:");
    act(() => root.unmount());
  });

  it("un pago de la otra empresa marca el cruce solo y dice el préstamo", () => {
    const { div, arriba, root } = abrir(inicial([pago({ empresa: "DR", cuentaId: "dr-banco" })]));
    expect(arriba.value).toBe("__CRUCE__");
    expect(div.textContent).toContain("Préstamo entre empresas");
    expect(div.textContent).toContain("$1210");
    act(() => root.unmount());
  });

  it("el proveedor de la otra empresa es un desvío", () => {
    const { div, arriba, root } = abrir(inicial([pago()], { supplier: "De la otra SA" }));
    expect(arriba.value).toBe("__CRUCE__");
    expect(div.textContent).toContain("desvío: le compra la otra empresa");
    act(() => root.unmount());
  });

  it("el proveedor compartido no es cruce", () => {
    const { div, arriba, root } = abrir(inicial([pago()], { supplier: "Compartido SA" }));
    expect(arriba.value).toBe("BGA");
    expect(div.textContent).toContain("las dos empresas");
    act(() => root.unmount());
  });

  it("elegir una empresa arriba acomoda el pago a esa empresa", () => {
    // Proveedor compartido, asi lo unico cruzado es el pago.
    const { div, arriba, elegirArriba, root } = abrir(inicial([pago({ empresa: "DR", cuentaId: "dr-banco" })], { supplier: "Compartido SA" }));
    expect(arriba.value).toBe("__CRUCE__");
    elegirArriba("DR");
    expect(arriba.value).toBe("DR");
    expect(div.textContent).not.toContain("Préstamo entre empresas");
    act(() => root.unmount());
  });

  it("si la factura pasa a la otra empresa, el proveedor queda desviado", () => {
    const { div, arriba, elegirArriba, root } = abrir(inicial([pago()]));
    expect(arriba.value).toBe("BGA");
    elegirArriba("DR"); // el proveedor es de BGA
    expect(arriba.value).toBe("__CRUCE__");
    expect(div.textContent).toContain("desvío: le compra la otra empresa");
    expect(div.textContent).toContain("no mueve la cuenta entre las dos");
    act(() => root.unmount());
  });

  it("se puede forzar el cruce a mano aunque todavía no haya un pago de la otra", () => {
    const { div, arriba, elegirArriba, root } = abrir(inicial([pago()]));
    elegirArriba("__CRUCE__");
    expect(arriba.value).toBe("__CRUCE__");
    expect(div.textContent).toContain("Marcado como cruce a mano");
    act(() => root.unmount());
  });
});
