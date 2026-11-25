import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { BuscadorVarios } from "./VinculoUi";
import { fichasDeExtracto, type MovimientoF, type PagoBancoF } from "../domain/fichaExtracto";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 25/11/2026: "desde 1 solo pago se cancelan 2 facturas [...] necesito poder seleccionar mas de un pago, para que
// sumados den el total de la transferencia". Cada factura sigue con su pago; se linkean varios al mismo movimiento.
const transferencia: MovimientoF = { id: 1, company: "BGA", bank: "Santander", currency: "ARS", date: "2026-11-16", concept: "Transferencia a Pinturería", movementType: "debito", amount: 300, balance: 700 };
const pago = (id: number, amount: number, extra: Partial<PagoBancoF> = {}): PagoBancoF => ({ id, company: "BGA", date: "2026-11-16", amount, supplier: "Pinturería", description: `Factura ${id}`, paymentMethod: "transferencia", cuentaId: "banco|BGA|santander|ARS", ...extra });

describe("una transferencia que cancela varias facturas", () => {
  it("dos pagos linkeados al mismo movimiento lo dejan linkeado y dicen cuántos son", () => {
    const f = fichasDeExtracto([transferencia], [pago(10, 100, { bankEntryId: 1 }), pago(11, 200, { bankEntryId: 1 })], [])[0];
    expect(f.movimientos[0].estado).toBe("linkeado");
    expect(f.movimientos[0].detalle).toContain("2 pagos cargados · Pinturería");
    expect(f.movimientos[0].detalle).not.toContain("⚠");
    expect(f.pendientes).toBe(0);
  });

  it("si lo linkeado no suma el movimiento, lo avisa", () => {
    const f = fichasDeExtracto([transferencia], [pago(10, 100, { bankEntryId: 1 }), pago(11, 150, { bankEntryId: 1 })], [])[0];
    expect(f.movimientos[0].detalle).toContain("⚠ suman 250");
  });

  it("sugiere los pagos del mismo proveedor que suman el importe", () => {
    const f = fichasDeExtracto([transferencia], [pago(10, 100), pago(11, 200), pago(12, 50)], [])[0];
    const s = f.movimientos[0].sugerencia as any;
    expect(f.movimientos[0].estado).toBe("sugerido");
    expect(s.tipo).toBe("pagos");
    expect(s.pagoIds.slice().sort()).toEqual([10, 11]);
  });

  it("no junta pagos de proveedores distintos", () => {
    const f = fichasDeExtracto([transferencia], [pago(10, 100), pago(11, 200, { supplier: "Otro" })], [])[0];
    expect(f.movimientos[0].estado).toBe("pendiente");
  });

  it("un pago por el importe exacto le gana a la suma", () => {
    const f = fichasDeExtracto([transferencia], [pago(10, 100), pago(11, 200), pago(12, 300)], [])[0];
    expect((f.movimientos[0].sugerencia as any).tipo).toBe("pago");
  });

  // Nicolas, 25/11/2026: "en cuanto al pago de sueldos, sale una transferencia tambien aglomerando todos los sueldos".
  it("los sueldos de un día que suman la transferencia se sugieren juntos, aunque sean de personas distintas", () => {
    const sueldo = (id: number, amount: number, nombre: string, extra: Partial<PagoBancoF> = {}) => pago(id, amount, { supplier: nombre, description: "Haberes 11/2026", haberes: true, ...extra });
    const f = fichasDeExtracto([transferencia], [sueldo(20, 120, "Ana"), sueldo(21, 80, "Luis"), sueldo(22, 100, "Rosa"), pago(30, 40)], [])[0];
    const s = f.movimientos[0].sugerencia as any;
    expect(s.tipo).toBe("pagos");
    expect(s.pagoIds.slice().sort()).toEqual([20, 21, 22]);
    expect(s.texto).toContain("haberes");
    const linkeado = fichasDeExtracto([transferencia], [sueldo(20, 120, "Ana", { bankEntryId: 1 }), sueldo(21, 80, "Luis", { bankEntryId: 1 }), sueldo(22, 100, "Rosa", { bankEntryId: 1 })], [])[0];
    expect(linkeado.movimientos[0].detalle).toBe("3 pagos cargados · haberes");
  });

  it("la ventana solo deja confirmar cuando lo tildado suma el movimiento", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const elegidos: string[][] = [];
    act(() =>
      createRoot(div).render(
        <BuscadorVarios
          titulo="Varios pagos"
          objetivo={300}
          money={(n: number) => `$${n}`}
          opciones={[
            { id: "10", texto: "Factura 10", monto: 100, grupo: "Pinturería" },
            { id: "11", texto: "Factura 11", monto: 200, grupo: "Pinturería" },
            { id: "12", texto: "Factura 12", monto: 50, grupo: "Otro" },
          ]}
          onElegir={(ids: string[]) => elegidos.push(ids)}
          onCerrar={() => {}}
        />
      )
    );
    const confirmar = () => div.querySelector("[data-confirmar]") as HTMLButtonElement;
    const tildar = (id: string) => act(() => (div.querySelector(`[data-opcion="${id}"] input`) as HTMLInputElement).click());
    const suma = () => div.querySelector("[data-suma]")!.textContent || "";
    expect(confirmar().disabled).toBe(true);
    tildar("10");
    expect(confirmar().disabled).toBe(true);
    expect(suma()).toContain("faltan $200");
    tildar("11");
    expect(confirmar().disabled).toBe(false);
    expect(suma()).toContain("coincide");
    tildar("12");
    expect(confirmar().disabled).toBe(true);
    expect(suma()).toContain("proveedores distintos");
    tildar("12");
    act(() => confirmar().click());
    expect(elegidos).toEqual([["10", "11"]]);
  });
});
