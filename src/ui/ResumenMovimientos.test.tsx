// El resumen de movimientos tiene que sumar bien: es para controlar que el numero de la planilla cierra.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ResumenMovimientos } from "./ResumenMovimientos";

it("ordena por fecha y lleva el saldo desde el saldo inicial", () => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() =>
    root.render(
      <ResumenMovimientos
        titulo="BGA · Galicia"
        saldoInicial={1000}
        filas={[
          { fecha: "2026-10-10", detalle: "Pago DAC", monto: -300 },
          { fecha: "2026-10-02", detalle: "Cobro P-3199", monto: 500 },
        ]}
        money={(n) => String(Math.round(n))}
        onCerrar={() => {}}
      />
    )
  );
  const filas = Array.from(div.querySelectorAll("tbody tr")).map((tr) => tr.textContent || "");
  expect(filas[0]).toContain("Saldo al empezar el mes");
  expect(filas[1]).toContain("Cobro P-3199");
  expect(filas[1]).toContain("1500");
  expect(filas[2]).toContain("Pago DAC");
  expect(filas[2]).toContain("1200");
  expect(div.textContent).toContain("saldo 1200");
  act(() => root.unmount());
  div.remove();
});
