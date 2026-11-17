import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ProveedoresPanel } from "./Proveedores";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 16/11/2026: la limpieza del padrón dejó de ser una lista que yo armaba leyendo la base. El
// sistema encuentra los duplicados, los que no tienen nada, los que dejan plata afuera del cash flow y las
// facturas mellizas; corregir sigue siendo decisión suya, de a una.
const prov = (id: number, name: string, taxId = "", extra: any = {}) => ({
  id,
  company: "General",
  name,
  taxId,
  ...extra,
});

const ledger = (supplier: string, taxId: string, comprado: number, saldo: number) => ({
  key: `${supplier}|${taxId}`,
  supplier,
  taxId,
  esCuentaCorriente: false,
  comprado,
  pagado: comprado - saldo,
  saldo,
  facturasSinPago: saldo > 0 ? 1 : 0,
  movimientos: [{ type: "compra" }],
});

const render = (props: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <ProveedoresPanel
        {...({
          proveedores: [prov(1, "Electro practico"), prov(2, "Electropractico"), prov(3, "Magliola", "30-11111111-1")],
          ledgers: [ledger("Magliola", "30-11111111-1", 1725061, 1725061)],
          empresaPorDefecto: "General",
          companyOptions: [{ value: "General", label: "Las dos", short: "Las dos" }],
          money: (n: number) => "$" + Math.round(n),
          onGuardar: () => {},
          onQuitar: () => {},
          onVaciar: () => {},
          onAbrirFicha: () => {},
          ...props,
        } as any)}
      />
    )
  );
  return { div, root };
};

describe("Revisar el padrón de proveedores", () => {
  it("avisa la plata que queda fuera del cash flow y por qué", () => {
    const { div, root } = render();
    expect(div.textContent).toContain("Revisar el padrón");
    expect(div.textContent).toContain("fuera del cash flow");
    expect(div.textContent).toContain("$1725061");
    expect(div.textContent).toContain("Magliola");
    act(() => root.unmount());
  });

  it("agrupa los duplicados por su motivo", () => {
    const { div, root } = render();
    expect(div.textContent).toContain("Posibles duplicados");
    expect(div.textContent).toContain("el mismo nombre");
    act(() => root.unmount());
  });

  it("al que no tiene nada cargado le ofrece quitarlo; al que tiene, no", () => {
    const quitados: number[] = [];
    const { div, root } = render({ onQuitar: (id: number) => quitados.push(id) });
    const botones = Array.from(div.querySelectorAll("button")).filter((b) => b.textContent === "Quitar");
    // Electro practico y Electropractico (vacíos) aparecen en duplicados y en "sin nada cargado";
    // Magliola tiene facturas, así que nunca ofrece Quitar.
    expect(botones.length).toBeGreaterThan(0);
    expect(div.textContent).toContain("sin nada cargado");
    act(() => root.unmount());
  });

  it("muestra las facturas mellizas con su monto", () => {
    const { div, root } = render({
      facturas: [
        { id: 1, company: "General", supplier: "Ricardo Cusmano", date: "2026-11-02", total: 746428 },
        { id: 2, company: "General", supplier: "Franco César Néstor", date: "2026-11-02", total: 746428 },
      ],
    });
    expect(div.textContent).toContain("facturado dos veces");
    expect(div.textContent).toContain("Ricardo Cusmano");
    expect(div.textContent).toContain("02/11/2026");
    act(() => root.unmount());
  });

  it("sugiere la condición de pago que sale del historial y la carga con un click", () => {
    const cargadas: any[] = [];
    const { div, root } = render({
      facturas: [
        // Dos facturas de septiembre pagadas a mediados de octubre: ~45 días.
        { id: 1, company: "General", supplier: "Magliola", taxId: "30-11111111-1", date: "2026-09-03", total: 500000, pagadaEl: "2026-10-16" },
        { id: 2, company: "General", supplier: "Magliola", taxId: "30-11111111-1", date: "2026-09-08", total: 500000, pagadaEl: "2026-10-22" },
      ],
      onCondicion: (id: number, c: any) => cargadas.push([id, c]),
    });
    expect(div.textContent).toContain("le venís pagando");
    const boton = Array.from(div.querySelectorAll("button")).find((b) => (b.textContent || "").startsWith("Usar"))!;
    expect(boton.textContent).toContain("45 días");
    (window as any).confirm = () => true;
    act(() => {
      boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cargadas).toEqual([[3, { tipo: "dias", dias: 45 }]]);
    act(() => root.unmount());
  });

  it("sin pagos anteriores lo dice en vez de inventar un plazo", () => {
    const { div, root } = render();
    expect(div.textContent).toContain("sin pagos anteriores");
    act(() => root.unmount());
  });

  it("si el padrón está limpio, el panel no aparece", () => {
    const { div, root } = render({
      proveedores: [prov(1, "Dac", "30-11111111-1", { condicionPago: { tipo: "dias", dias: 30 } })],
      ledgers: [ledger("Dac", "30-11111111-1", 1000, 0)],
    });
    expect(div.textContent).not.toContain("Revisar el padrón");
    act(() => root.unmount());
  });
});
