// Celda del DESBALANCE blanco/negro de una caja chica (ver resumenCaja en domain/cajaChicaFicha).
import React from "react";
import type { ResumenCaja } from "../domain/cajaChicaFicha";

export function DesbalanceCaja({ r, money }: { r: Pick<ResumenCaja, "negroFacturado" | "blancoSinFactura" | "desbalanceConocido" | "utilizado">; money: (n: number) => string }) {
  if (!r.desbalanceConocido) {
    return (
      <span style={{ fontSize: 11.5, color: "#94a3b8" }} title="La caja no tiene cargado cuanto entro en blanco y cuanto en negro: editala y cargalo">
        falta origen B/N
      </span>
    );
  }
  const lineas: React.ReactNode[] = [];
  if (r.negroFacturado > 0.5) {
    lineas.push(
      <div key="nf" style={{ color: "#b45309", fontWeight: 800, whiteSpace: "nowrap" }} title="Compras CON FACTURA pagadas con plata NEGRA de la caja">
        N→B {money(r.negroFacturado)}
      </div>
    );
  }
  if (r.blancoSinFactura > 0.5) {
    lineas.push(
      <div key="bs" style={{ color: "#7c3aed", fontWeight: 800, whiteSpace: "nowrap" }} title="Gastos SIN FACTURA pagados con plata BLANCA de la caja">
        B→N {money(r.blancoSinFactura)}
      </div>
    );
  }
  if (lineas.length === 0) {
    return <span style={{ fontSize: 11.5, color: "#16a34a" }}>{r.utilizado > 0 ? "✓ equilibrada" : "—"}</span>;
  }
  return <>{lineas}</>;
}
