import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { PaseModal } from "./PaseModal";
import type { PaseForm } from "../domain/pases";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const cuenta = (id: string, company: string, nombre: string): any => ({ id, company, tipo: "banco", nombre, moneda: "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "2026-01-01", activa: true });
const cuentas = [cuenta("s", "BGA", "Santander"), cuenta("p", "BGA", "Patagonia"), cuenta("r", "DR", "Galicia")];
const base: PaseForm = { date: "2026-11-04", amount: 2700000, currency: "ARS", company: "BGA", cuentaId: "s", companyDestino: "BGA", cuentaDestinoId: "p", description: "", notes: "" };

const abrir = (inicial: PaseForm, onGuardar = jest.fn()) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <PaseModal inicial={inicial} empresas={[{ value: "BGA", short: "BGA" }, { value: "DR", short: "De Raíz" }]} cuentas={cuentas} money={(n) => `$${n}`} onGuardar={onGuardar} onCerrar={() => {}} />
    )
  );
  const boton = Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Guardar pase") as HTMLButtonElement;
  return { div, boton, onGuardar };
};

describe("ficha del pase", () => {
  it("sin origen o sin destino no deja guardar y dice que falta", () => {
    const sinOrigen = abrir({ ...base, cuentaId: "" });
    expect(sinOrigen.boton.disabled).toBe(true);
    expect(sinOrigen.div.textContent).toContain("de dónde sale");
    const sinDestino = abrir({ ...base, cuentaDestinoId: "" });
    expect(sinDestino.boton.disabled).toBe(true);
    expect(sinDestino.div.textContent).toContain("a dónde va");
  });

  it("la misma cuenta en las dos puntas no se puede", () => {
    expect(abrir({ ...base, cuentaDestinoId: "s" }).boton.disabled).toBe(true);
  });

  it("completo se guarda; dentro de la misma empresa no avisa de deuda", () => {
    const { boton, div, onGuardar } = abrir(base);
    expect(div.textContent).not.toContain("le debe");
    act(() => boton.click());
    expect(onGuardar).toHaveBeenCalledWith(base);
  });

  it("entre dos empresas avisa quien queda debiendo", () => {
    const { div } = abrir({ ...base, companyDestino: "DR", cuentaDestinoId: "r" });
    expect(div.textContent).toContain("De Raíz le debe $2700000 a BGA");
  });
});
