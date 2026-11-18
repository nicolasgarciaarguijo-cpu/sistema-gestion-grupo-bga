// COSTOS DE TARJETA PARA COTIZACION (fijo / variable). Salio de la solapa Tarjetas para entrar en la ficha
// "Cuentas y costos de bancos y tarjetas" (Nicolas, 18/11/2026: "cuentas, costo real y costos tarjetas,
// armame los 3 en una ficha nueva"). Es lo que se vuelca a los Marcadores para cotizar.
import React from "react";
import { Panel, MiniMetric } from "./primitives";
import { styles } from "./styles";
import { planillaTable, colLabel, colDato, colFlexible, thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible } from "./planilla";
import { money } from "../lib/format";
import type { CardCostSummary } from "../domain/cardCosts";

export function CostosTarjetaCotizacion({ cardCostSummary }: { cardCostSummary: CardCostSummary }) {
  return (
    <Panel title="Costos de tarjeta para cotización · fijo / variable" span="full" nested>

        <div style={styles.metricGrid}>
          <MiniMetric label="Fijo $ (mes)" value={money(cardCostSummary.ars.fijo)} />
          <MiniMetric label="Variable $ (mes)" value={money(cardCostSummary.ars.variable)} />
          <MiniMetric label="Total $" value={money(cardCostSummary.ars.total)} />
          {(cardCostSummary.usd.total !== 0) && (
            <>
              <MiniMetric label="Fijo U$S" value={money(cardCostSummary.usd.fijo, "USD")} />
              <MiniMetric label="Variable U$S" value={money(cardCostSummary.usd.variable, "USD")} />
            </>
          )}
        </div>
        {cardCostSummary.byGroup.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Cargá consumos y clasificalos a un grupo para ver el desglose fijo/variable.
          </div>
        ) : (
          <table className="planilla" style={{ ...planillaTable, marginTop: 10 }}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>Grupo</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Total</th>
                <th style={{ ...thFlexible, textAlign: "right" }}>Recurrente / mes</th>
              </tr>
            </thead>
            <tbody>
              {cardCostSummary.byGroup.map((r) => (
                <tr key={`${r.group}-${r.currency}`}>
                  <td style={{ ...tdNombre, fontWeight: 400 }}>
                    <span
                      title={r.kind === "fijo" ? "Costo fijo" : "Costo variable"}
                      style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                        background: r.kind === "fijo" ? "#2563eb" : "#ca8a04",
                      }}
                    />
                    {r.group}
                    {r.currency === "USD" ? " (U$S)" : ""}
                  </td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                    {money(r.total, r.currency)}
                  </td>
                  <td style={{ ...tdFlexible, textAlign: "right", color: "#7c3aed" }}>
                    {r.recurringMonthly > 0 ? money(r.recurringMonthly, r.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 6 }}>
          La columna <strong>Recurrente / mes</strong> junta los consumos marcados como recurrentes: es
          lo que conviene volcar al marcador correspondiente.
        </div>
    </Panel>
  );
}
