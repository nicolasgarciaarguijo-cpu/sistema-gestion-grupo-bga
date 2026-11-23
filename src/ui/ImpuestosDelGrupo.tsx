// IMPUESTOS, COMISIONES E INTERESES DE UN MES (o de un resumen), ADENTRO DE SU FICHA.
//
// Nicolas, 18/11/2026: "tarjetas e impuestos y comisiones eso sí lo quiero dentro de las fichas". Antes
// esto vivia en el bloque "Impuestos y comisiones del extracto y la tarjeta", una lista de TODOS los
// meses de TODOS los bancos; ahora cada ficha muestra y tilda EL SUYO: la del extracto el del mes que
// se esta mirando, la de la tarjeta el del resumen.
//
// Tildarlo pagado asienta el pago desde la cuenta de ese banco (y baja su saldo); destildarlo lo saca.
// Ver domain/impuestosBancarios.ts.
import React, { useState } from "react";
import { ETIQUETA_CATEGORIA, type CategoriaImpuesto, type GrupoImpuestos } from "../domain/impuestosBancarios";

const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "middle" };
const ddmm = (iso: string) => String(iso || "").slice(0, 10).split("-").reverse().join("/");

export type ImpuestosDeLaFicha = {
  grupo: GrupoImpuestos;
  pago: { fecha: string } | null;
  cuenta: { id: string; nombre: string } | null;
};

export function ImpuestosDelGrupo({
  titulo,
  datos,
  money,
  onPagado,
  bloqueo,
}: {
  titulo: string; // "Comisiones, tasas e intereses (cuenta)" / "(tarjeta)"
  datos: ImpuestosDeLaFicha | null;
  money: (n: number) => string;
  onPagado: (g: GrupoImpuestos, pagado: boolean) => void;
  // Motivo por el que todavia no se puede tildar (ej. hay cargos ya cargados sin linkear: se descontarian dos veces).
  bloqueo?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!datos) return null;
  const { grupo: g, pago, cuenta } = datos;
  return (
    <div style={{ background: pago ? "#f0fdf4" : "#fffbeb", border: `1px solid ${pago ? "#bbf7d0" : "#fcd34d"}`, borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          title="Ver el detalle de cada débito"
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#7c3aed" }}
        >
          {abierto ? "▾" : "▸"} {titulo} · {money(g.total)}
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {g.lineas.length} débito(s)
          {g.moneda === "USD" ? " · U$S" : ""}
        </span>
        {(["impuestos", "comisiones", "intereses"] as CategoriaImpuesto[])
          .filter((k) => g.porCategoria[k])
          .map((k) => (
            <span key={k} style={{ fontSize: 12, color: "#475569" }}>
              {ETIQUETA_CATEGORIA[k]} {money(g.porCategoria[k])}
            </span>
          ))}
        <label
          style={{ display: "inline-flex", gap: 5, alignItems: "center", cursor: cuenta ? "pointer" : "not-allowed", fontSize: 12.5, fontWeight: 700, marginLeft: "auto" }}
          title={cuenta ? `Se paga desde ${cuenta.nombre}` : `Primero creá la cuenta de ${g.banco || "ese banco"} en Cuentas`}
        >
          <input
            type="checkbox"
            disabled={(!cuenta && !pago) || (!!bloqueo && !pago)}
            checked={!!pago}
            onChange={(e) => {
              if (!e.target.checked && !window.confirm("¿Destildar? Se borra el pago asentado y la cuenta vuelve a tener esa plata.")) return;
              onPagado(g, e.target.checked);
            }}
          />
          {pago ? `✓ pagado el ${ddmm(pago.fecha)}` : `pagado · vence ${ddmm(g.fecha)}`}
        </label>
      </div>
      {bloqueo && !pago && <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>{bloqueo}</div>}
      <div style={{ fontSize: 12, color: cuenta ? "#64748b" : "#b91c1c" }}>
        {cuenta ? `Sale de ${cuenta.nombre}.` : `Sin cuenta de ${g.banco || "ese banco"}: creala en Cuentas para poder asentar el pago.`}
      </div>
      {abierto && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
          <tbody>
            {g.lineas.map((l) => (
              <tr key={l.id}>
                <td style={{ ...td, width: 90 }}>{ddmm(l.fecha)}</td>
                <td style={td}>{l.descripcion}</td>
                <td style={{ ...td, width: 110, color: "#64748b" }}>{ETIQUETA_CATEGORIA[l.categoria]}</td>
                <td style={{ ...td, width: 130, textAlign: "right" }}>{money(l.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
