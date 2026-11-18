// FICHA: CUENTAS Y COSTOS DE BANCOS Y TARJETAS (Nicolas, 18/11/2026: "cuentas, costo real y costos
// tarjetas, armame los 3 en una ficha nueva"). Junta los tres bloques que antes andaban sueltos en la
// solapa: de donde sale y a donde entra la plata, lo que cuesta cada cuenta y cada tarjeta, y lo que se
// vuelca a los marcadores para cotizar. Cada uno sigue siendo su propio panel, plegable, adentro.
import React from "react";
import { Panel } from "./primitives";

export function CuentasYCostos({
  cuentas,
  costoReal,
  costosTarjeta,
}: {
  cuentas: React.ReactNode;
  costoReal: React.ReactNode;
  costosTarjeta: React.ReactNode;
}) {
  return (
    <Panel span="full" abierto title="Cuentas y costos de bancos y tarjetas">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        De dónde sale y a dónde entra la plata, lo que cuesta de verdad cada cuenta y cada tarjeta, y lo que
        se vuelca a los marcadores para cotizar. El movimiento de cada cuenta y el detalle de cada resumen
        están en <strong>Bancos y tarjetas</strong>, en la ficha de cada una.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {cuentas}
        {costoReal}
        {costosTarjeta}
      </div>
    </Panel>
  );
}
