// La ficha de caja chica tiene que dejar ABRIR un gasto rendido para corregirlo (Nicolas, 27/10/2026:
// "no te abre la ventana"): doble click o click derecho → "Abrir / editar…" llaman a onAbrirGasto.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaCajaChica } from "./FichaCajaChica";
import { GastoCajaChicaModal } from "./GastoCajaChicaModal";

const fondo = { id: 1, company: "BGA", responsible: "Juan", description: "", amount: 100000, deliveredDate: "2026-10-01", closed: false, tipo: "General" } as any;
const gasto = { id: 50, fundId: 1, company: "BGA", date: "2026-10-10", amount: 5000, supplier: "Ferretería", description: "Tornillos", administration: "negro", costGroup: "Operativos", costGroupKind: "fijo" } as any;

const montar = (el: React.ReactElement) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, desmontar: () => { act(() => root.unmount()); host.remove(); } };
};

const props = (onAbrirGasto: (id: number) => void) => ({
  responsable: "Juan", fondos: [fondo], gastos: [gasto], viaticos: [], deudas: [],
  companyShort: (c: string) => c, money: (n: number) => String(n), facturaDeGasto: () => null,
  ocrBusy: false, ocrMsg: "", onCerrar: () => {}, onNuevaCaja: () => {}, onEditarCaja: () => {}, onCerrarCaja: () => {},
  onReabrirCaja: () => {}, onQuitarCaja: () => {}, onRendirGasto: () => {}, onLeerTicket: () => {},
  onAbrirGasto, onQuitarGasto: () => {}, onAdjuntar: () => {}, onViaticoRendido: () => {},
});

const filaDelGasto = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("tr")).find((tr) => (tr.textContent || "").includes("Tornillos")) as HTMLElement;

describe("abrir un gasto rendido desde la ficha de caja chica", () => {
  it("doble click abre el gasto", () => {
    const abrir = jest.fn();
    const m = montar(<FichaCajaChica {...(props(abrir) as any)} />);
    act(() => { filaDelGasto(m.host).dispatchEvent(new MouseEvent("dblclick", { bubbles: true })); });
    expect(abrir).toHaveBeenCalledWith(50);
    m.desmontar();
  });

  it("click derecho → Abrir / editar… abre el gasto", () => {
    const abrir = jest.fn();
    const m = montar(<FichaCajaChica {...(props(abrir) as any)} />);
    act(() => { filaDelGasto(m.host).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 })); });
    const boton = Array.from(m.host.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Abrir / editar")) as HTMLElement;
    expect(boton).toBeTruthy();
    act(() => { boton.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(abrir).toHaveBeenCalledWith(50);
    m.desmontar();
  });

  it("el botón ✎ Editar abre el gasto", () => {
    const abrir = jest.fn();
    const m = montar(<FichaCajaChica {...(props(abrir) as any)} />);
    const boton = Array.from(filaDelGasto(m.host).querySelectorAll("button")).find((b) => (b.textContent || "").includes("Editar")) as HTMLElement;
    act(() => { boton.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(abrir).toHaveBeenCalledWith(50);
    m.desmontar();
  });

  it("la ventana del gasto se dibuja con un gasto ya cargado", () => {
    const m = montar(
      <GastoCajaChicaModal
        inicial={{ id: 50, fundId: 1, company: "BGA", supplier: "Ferretería", taxId: "", altaProveedor: false, date: "2026-10-10", amount: 5000, administration: "negro", grupoCosto: "fijo|Operativos", description: "Tornillos", invoiceNumber: "", notes: "" }}
        cajas={[fondo]}
        proveedores={[{ id: 1, name: "Ferretería", taxId: "", company: "BGA" }]}
        grupos={[{ key: "fijo|Operativos", label: "Fijo · Operativos" }]}
        onGuardar={() => {}}
        onCerrar={() => {}}
      />
    );
    expect(m.host.textContent).toContain("Gasto de caja chica");
    m.desmontar();
  });
});
