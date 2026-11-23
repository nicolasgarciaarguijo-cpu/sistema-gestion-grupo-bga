import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { PagoACuentaModal, type PagoACuentaForm } from "./PagoACuentaModal";

// Nicolas, 23/11/2026: "dentro de las opciones de pagos sin facturas, quiero que figure pago de impuestos, tasas e
// intereses" + "sumale descripcion que va a ayudar a reconocer el gasto".
const base: PagoACuentaForm = { supplier: "Maderas SA", taxId: "", company: "BGA", fecha: "2026-11-23", monto: 1500, metodo: "transferencia", administration: "blanco", notas: "" };
const cuentas = [
  { id: "banco|BGA|santander|ARS", company: "BGA", nombre: "Santander", moneda: "ARS", tipo: "banco" },
  { id: "efectivo|BGA", company: "BGA", nombre: "Efectivo", moneda: "ARS", tipo: "efectivo" },
];
const pintar = (inicial: PagoACuentaForm, onGuardar = jest.fn()) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() => createRoot(div).render(<PagoACuentaModal inicial={inicial} companyOptions={[{ value: "BGA" }]} cuentas={cuentas as any} money={(n) => `$${n}`} onGuardar={onGuardar} onCerrar={() => {}} />));
  return { div, onGuardar };
};
const escribir = (el: HTMLInputElement | HTMLSelectElement, valor: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, valor);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};
const guardar = (div: HTMLElement) => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Guardar pago") as HTMLButtonElement;

describe("pago sin factura: impuestos, tasas e intereses del banco", () => {
  it("la opcion figura junto al pago a cuenta y cambia lo que pide la ficha", () => {
    const { div } = pintar(base);
    expect(div.querySelector('[data-opcion="impuestos"]')!.textContent).toBe("Impuestos, tasas e intereses (sin factura)");
    expect(div.querySelector("[data-donde-impuesto]")).toBeNull();
    act(() => (div.querySelector('[data-opcion="impuestos"]') as HTMLButtonElement).click());
    expect(div.querySelector("[data-donde-impuesto]")).not.toBeNull();
    expect(div.querySelector("[data-tipo-impuesto]")).not.toBeNull();
    expect(div.textContent).toContain("Descripción (para reconocer el gasto)");
    expect(div.textContent).not.toContain("Queda a favor");
    // Solo cuentas de banco: el efectivo no cobra impuestos.
    expect(div.textContent).not.toContain("Efectivo");
  });

  it("no deja guardar sin cuenta ni sin descripcion, y guarda marcado como impuesto del banco", () => {
    const { div, onGuardar } = pintar({ ...base, impuestoBanco: true, metodo: "debito" });
    expect(guardar(div).disabled).toBe(true);
    const cuenta = Array.from(div.querySelectorAll("select")).find((s) => Array.from(s.options).some((o) => o.value === "banco|BGA|santander|ARS"))!;
    act(() => escribir(cuenta, "banco|BGA|santander|ARS"));
    expect(guardar(div).disabled).toBe(true);
    act(() => escribir(div.querySelector("[data-descripcion-pago]") as HTMLInputElement, "impuesto al crédito, transferencia de Pérez"));
    act(() => escribir(div.querySelector("[data-tipo-impuesto]") as HTMLSelectElement, "Comisión"));
    expect(guardar(div).disabled).toBe(false);
    act(() => guardar(div).click());
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ impuestoBanco: true, metodo: "debito", cuentaId: "banco|BGA|santander|ARS", impuestoTipo: "Comisión", notas: "impuesto al crédito, transferencia de Pérez", monto: 1500 }));
  });

  it("el pago a cuenta de siempre sigue igual", () => {
    const { div } = pintar(base);
    expect(div.textContent).toContain("Queda a favor $1500 hasta la factura");
    expect(div.textContent).toContain("Medio de pago");
  });
});

describe("pago sin factura: conciliacion a fin de mes", () => {
  it("es la tercera opcion: no dice que queda a favor ni espera factura, y pide la descripcion", () => {
    const onGuardar = jest.fn();
    const { div } = pintar({ ...base, cuentaId: "banco|BGA|santander|ARS" }, onGuardar);
    act(() => (div.querySelector('[data-opcion="concilia"]') as HTMLButtonElement).click());
    expect(div.textContent).not.toContain("Queda a favor");
    expect(div.textContent).toContain("no avisa que falta la factura");
    expect(guardar(div).disabled).toBe(true);
    act(() => escribir(div.querySelector("[data-descripcion-pago]") as HTMLInputElement, "débito automático de la Visa"));
    act(() => guardar(div).click());
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ conciliaFinDeMes: true, impuestoBanco: false, notas: "débito automático de la Visa" }));
  });
});

describe("pago sin factura: constatacion contra VEP", () => {
  it("es una opcion mas y avisa que falta cargar el VEP", () => {
    const onGuardar = jest.fn();
    const { div } = pintar({ ...base, cuentaId: "banco|BGA|santander|ARS" }, onGuardar);
    act(() => (div.querySelector('[data-opcion="vep"]') as HTMLButtonElement).click());
    expect(div.textContent).toContain("Falta cargar el VEP de $1500");
    expect(div.textContent).not.toContain("Queda a favor");
    act(() => guardar(div).click());
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ esperaVep: true, conciliaFinDeMes: false, impuestoBanco: false }));
  });
});
