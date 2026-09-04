// Solapa Inversiones: donde ponemos plata a trabajar (plazo fijo, FCI, acciones, cripto, inmuebles...).
//
// Cada inversion lleva el capital invertido y su valuacion actual; el crecimiento sale de la diferencia.
// La moneda importa: ARS y USD se muestran por separado (no se suman). La vinculacion con el Calendario
// anual (la planilla) es el proximo paso ("de a poco").
import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, ButtonLike } from "../ui/primitives";
import { money } from "../lib/format";
import {
  TIPOS_INVERSION_SUGERIDOS,
  crecimientoInversion,
  resumenInversionesPorEmpresa,
} from "../domain/inversiones";
import type { CompanyName, Inversion } from "../domain/types";

type InversionesTabProps = {
  inversiones: Inversion[];
  companyScope: string;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  onScopeChange: (scope: string) => void;
  addInversion: () => void;
  removeInversion: (id: number) => void;
  updateInversion: (id: number, field: keyof Inversion, value: any) => void;
};

const GAIN_COLOR = "#16a34a";
const LOSS_COLOR = "#dc2626";

// Formatea un monto con el simbolo de la moneda (money() ya pone $; para USD anteponemos US$).
const montoMoneda = (n: number, moneda: "ARS" | "USD") =>
  moneda === "USD" ? `US$ ${money(n).replace(/^\$\s?/, "")}` : money(n);

export function InversionesTab({
  inversiones,
  companyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  onScopeChange,
  addInversion,
  removeInversion,
  updateInversion,
}: InversionesTabProps) {
  const companies: CompanyName[] = COMPANY_OPTIONS.map((c) => c.value);
  const resumen = resumenInversionesPorEmpresa(inversiones, companies);
  const visibles = inversiones.filter((i) => companyScope === "__ALL__" || i.company === companyScope);

  const bloqueMoneda = (label: string, m: { invertido: number; valorActual: number; ganancia: number; pct: number; cantidad: number }, moneda: "ARS" | "USD") => {
    if (m.cantidad === 0) return null;
    const col = m.ganancia >= 0 ? GAIN_COLOR : LOSS_COLOR;
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ ...styles.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 13 }}>
          Invertido {montoMoneda(m.invertido, moneda)} · Hoy {montoMoneda(m.valorActual, moneda)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: col }}>
          {m.ganancia >= 0 ? "▲" : "▼"} {montoMoneda(Math.abs(m.ganancia), moneda)} ({m.pct.toFixed(1)}%)
        </div>
      </div>
    );
  };

  return (
    <>
      <Panel title="Inversiones — resumen" span="full">
        <div style={styles.grid2}>
          <Field label="Empresa">
            <select style={styles.input} value={companyScope} onChange={(e) => onScopeChange(e.target.value)}>
              <option value="__ALL__">Todas las empresas</option>
              {COMPANY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.short}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={styles.metricGrid}>
          {resumen
            .filter((r) => companyScope === "__ALL__" || r.company === companyScope)
            .map((r) => {
              const meta = getCompanyMeta(r.company);
              return (
                <div key={r.company} style={{ ...styles.metric, borderColor: meta.primary, background: meta.soft }}>
                  <div style={{ fontWeight: 800, color: meta.primary }}>{meta.short || r.company}</div>
                  <div style={styles.muted}>{r.activas} inversión(es) activa(s)</div>
                  {r.activas === 0 && <div style={{ ...styles.muted, fontSize: 12 }}>Sin inversiones cargadas.</div>}
                  {bloqueMoneda("En pesos", r.ars, "ARS")}
                  {bloqueMoneda("En dólares", r.usd, "USD")}
                </div>
              );
            })}
        </div>
        <div style={styles.sectionNote}>
          El crecimiento sale de comparar el capital invertido con la valuación actual (se actualiza a
          mano). Pesos y dólares se muestran por separado. Próximo paso: vincular con el Calendario anual.
        </div>
      </Panel>

      <Panel
        title="Inversiones"
        span="full"
        actions={<ButtonLike onClick={addInversion}>Agregar inversión</ButtonLike>}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Moneda</th>
                <th style={{ textAlign: "right" }}>Invertido</th>
                <th style={{ textAlign: "right" }}>Valor actual</th>
                <th style={{ textAlign: "right" }}>Crecimiento</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ color: "#64748b" }}>
                    Todavía no cargaste inversiones. Agregá la primera (plazo fijo, dólares, FCI…).
                  </td>
                </tr>
              )}
              {visibles.map((i) => {
                const cre = crecimientoInversion(i);
                const col = cre.ganancia >= 0 ? GAIN_COLOR : LOSS_COLOR;
                const cerrada = i.estado === "cerrada";
                return (
                  <tr key={i.id} style={cerrada ? { opacity: 0.55 } : undefined}>
                    <td>
                      <select
                        style={styles.input}
                        value={i.company}
                        onChange={(e) => updateInversion(i.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        list="tipos-inversion"
                        value={i.tipo}
                        placeholder="Plazo fijo, FCI…"
                        onChange={(e) => updateInversion(i.id, "tipo", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={i.descripcion}
                        onChange={(e) => updateInversion(i.id, "descripcion", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={i.moneda}
                        onChange={(e) => updateInversion(i.id, "moneda", e.target.value)}
                      >
                        <option value="ARS">$ (pesos)</option>
                        <option value="USD">US$ (dólares)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ ...styles.input, textAlign: "right" }}
                        value={i.montoInvertido}
                        onChange={(e) => updateInversion(i.id, "montoInvertido", Number(e.target.value || 0))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ ...styles.input, textAlign: "right" }}
                        value={i.valorActual}
                        onChange={(e) => updateInversion(i.id, "valorActual", Number(e.target.value || 0))}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: col }}>
                      {cre.ganancia >= 0 ? "▲" : "▼"} {montoMoneda(Math.abs(cre.ganancia), i.moneda)}
                      <div style={{ fontSize: 11 }}>{cre.pct.toFixed(1)}%</div>
                    </td>
                    <td>
                      <input
                        type="date"
                        style={styles.input}
                        value={i.fechaInicio}
                        onChange={(e) => updateInversion(i.id, "fechaInicio", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        style={styles.input}
                        value={i.fechaFin}
                        onChange={(e) => updateInversion(i.id, "fechaFin", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={i.estado}
                        onChange={(e) => updateInversion(i.id, "estado", e.target.value)}
                      >
                        <option value="activa">Activa</option>
                        <option value="cerrada">Cerrada</option>
                      </select>
                    </td>
                    <td>
                      <ButtonLike onClick={() => removeInversion(i.id)} secondary>
                        Quitar
                      </ButtonLike>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="tipos-inversion">
          {TIPOS_INVERSION_SUGERIDOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Panel>
    </>
  );
}
