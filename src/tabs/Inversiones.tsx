// Solapa Inversiones: donde ponemos plata a trabajar (plazo fijo, FCI, acciones, cripto, inmuebles...).
//
// Cada inversion lleva el capital invertido y su valuacion actual; el crecimiento sale de la diferencia.
// La moneda importa: ARS y USD se muestran por separado (no se suman). La vinculacion con el Calendario
// anual: la colocacion sale de su cuenta (EGRESOS · INVERSIONES) y el rescate vuelve a INGRESOS ·
// INVERSIONES en el renglon de su tipo (ver domain/inversionesCalendario).
import { FichaRegistro, BotonFicha, type CampoFicha } from "../ui/FichaRegistro";
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
import { FirmanteCelda } from "../ui/FirmanteSelect";

import NumInput from "../ui/NumInput";
type InversionesTabProps = {
  inversiones: Inversion[];
  companyScope: string;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  onScopeChange: (scope: string) => void;
  addInversion: () => void;
  removeInversion: (id: number) => void;
  updateInversion: (id: number, field: keyof Inversion, value: any) => void;
  // Vinculo con el Calendario: cuentas para elegir de donde sale / a donde vuelve.
  cuentas?: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
};

// Renglones del rescate en INGRESOS · INVERSIONES (vacio = segun el tipo).
const RENGLONES_RESCATE_LABEL: Array<[string, string]> = [
  ["", "Según el tipo"],
  ["rescate_plazo_fijo", "Rescate de plazo fijo"],
  ["rescate_fci_mix", "Rescate de FCI Mix"],
  ["rescate_fci_plus", "Rescate de FCI Plus"],
  ["rescate_cauciones", "Rescate de cauciones"],
  ["rescate_otra", "Rescate de otra inversión"],
];

const GAIN_COLOR = "#16a34a";
const LOSS_COLOR = "#dc2626";

// Formatea un monto con el simbolo de la moneda (money() ya pone $; para USD anteponemos US$).
const montoMoneda = (n: number, moneda: "ARS" | "USD") =>
  moneda === "USD" ? `US$ ${money(n).replace(/^\$\s?/, "")}` : money(n);

// 2026-11-14 (Nicolas): las filas solo MUESTRAN; se corrige todo en la ficha y la pantalla queda limpia.
const celda: React.CSSProperties = { fontSize: 12.5, color: "#0f172a", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const celdaNoWrap: React.CSSProperties = { ...celda, whiteSpace: "nowrap" };
const celdaDerecha: React.CSSProperties = { ...celdaNoWrap, textAlign: "right", fontWeight: 700 };
const fechaCorta = (iso?: string) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const etiqueta = (texto: string, fg = "#475569", bg = "#f1f5f9") => (
  <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>{texto}</span>
);

export function InversionesTab({
  inversiones,
  companyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  onScopeChange,
  addInversion,
  removeInversion,
  updateInversion,
  cuentas = [],
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

  const [ficha, setFicha] = React.useState<null | { tipo: string; id: number }>(null);
  return (
    <>
      {ficha && (() => {
        const i = inversiones.find((x) => x.id === ficha.id);
        if (!i) return null;
        const campos: CampoFicha[] = [
          { key: "company", label: "Empresa", tipo: "empresa" },
          { key: "tipo", label: "Tipo", tipo: "texto", sugerencias: [...TIPOS_INVERSION_SUGERIDOS] },
          { key: "descripcion", label: "Detalle", tipo: "texto" },
          { key: "moneda", label: "Moneda", tipo: "select", opciones: [{ value: "ARS", label: "Pesos" }, { value: "USD", label: "Dólares" }] },
          { key: "montoInvertido", label: "Monto invertido", tipo: "numero" },
          { key: "valorActual", label: "Valor actual", tipo: "numero" },
          { key: "fechaInicio", label: "Inicio", tipo: "fecha" },
          { key: "fechaFin", label: "Fin", tipo: "fecha" },
          { key: "estado", label: "Estado", tipo: "select", opciones: [{ value: "activa", label: "Activa" }, { value: "cerrada", label: "Cerrada" }] },
          { key: "administration", label: "Blanco / negro", tipo: "select", opciones: [{ value: "blanco", label: "Blanco" }, { value: "negro", label: "Negro" }] },
          // 2026-11-14: estaban solo en la fila.
          {
            key: "cuentaId",
            label: "De qué cuenta sale (y a cuál vuelve)",
            tipo: "select",
            obligatorio: true,
            vacio: "— Elegí la cuenta —",
            opciones: cuentas
              .filter((c) => c.company === i.company && c.activa !== false && (!c.moneda || c.moneda === i.moneda))
              .map((c) => ({ value: c.id, label: c.nombre })),
          },
          { key: "montoRescatado", label: "Monto rescatado (si queda vacío, se toma el valor actual)", tipo: "numero" },
          {
            key: "renglonRescate",
            label: "Renglón del Calendario donde entra el rescate",
            tipo: "select",
            opciones: RENGLONES_RESCATE_LABEL.map(([k, l]) => ({ value: k, label: l })),
          },
          { key: "notas", label: "Notas", tipo: "area" },
        ];
        return (
          <FichaRegistro
            titulo={`${i.tipo || "Inversión"}${i.descripcion ? ` · ${i.descripcion}` : ""}`}
            valores={i}
            campos={campos}
            empresas={COMPANY_OPTIONS}
            onCambiar={(k, v) => updateInversion(i.id, k as keyof Inversion, v)}
            onCerrar={() => setFicha(null)}
          />
        );
      })()}
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
                <th>B/N</th>
                <th>Cuenta</th>
                <th style={{ textAlign: "right" }}>Volvió (rescate)</th>
                <th>Renglón del rescate</th>
                <th>Firmante</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={16} style={{ color: "#64748b" }}>
                    Todavía no cargaste inversiones. Agregá la primera (plazo fijo, dólares, FCI…).
                  </td>
                </tr>
              )}
              {visibles.map((i) => {
                const cre = crecimientoInversion(i);
                const col = cre.ganancia >= 0 ? GAIN_COLOR : LOSS_COLOR;
                const cerrada = i.estado === "cerrada";
                return (
                  <tr
                    key={i.id}
                    style={{ ...(cerrada ? { opacity: 0.55 } : {}), cursor: "pointer" }}
                    onClick={() => setFicha({ tipo: "inversion", id: i.id })}
                    title="Click: abrir la ficha de la inversión"
                  >
                    {/* 2026-11-14: la fila SOLO MUESTRA; todo se corrige en la ficha de la inversion. */}
                    <td style={celdaNoWrap}>
                      {etiqueta(COMPANY_OPTIONS.find((c) => c.value === i.company)?.short || String(i.company))}
                      <BotonFicha onClick={() => setFicha({ tipo: "inversion", id: i.id })} />
                    </td>
                    <td style={celda}><strong>{i.tipo || "sin tipo"}</strong></td>
                    <td style={celda}>{i.descripcion || "—"}</td>
                    <td style={celdaNoWrap}>{i.moneda === "USD" ? "US$" : "$"}</td>
                    <td style={celdaDerecha}>{montoMoneda(i.montoInvertido || 0, i.moneda)}</td>
                    <td style={celdaDerecha}>{montoMoneda(i.valorActual || 0, i.moneda)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: col }}>
                      {cre.ganancia >= 0 ? "▲" : "▼"} {montoMoneda(Math.abs(cre.ganancia), i.moneda)}
                      <div style={{ fontSize: 11 }}>{cre.pct.toFixed(1)}%</div>
                    </td>
                    <td style={celdaNoWrap}>{fechaCorta(i.fechaInicio)}</td>
                    <td style={celdaNoWrap}>{fechaCorta(i.fechaFin)}</td>
                    <td style={celdaNoWrap}>
                      {etiqueta(cerrada ? "Cerrada" : "Activa", cerrada ? "#b91c1c" : "#15803d", cerrada ? "#fee2e2" : "#dcfce7")}
                    </td>
                    <td style={celdaNoWrap}>
                      {etiqueta(
                        (i.administration || "blanco") === "negro" ? "Negro" : "Blanco",
                        (i.administration || "blanco") === "negro" ? "#fff" : "#0f172a",
                        (i.administration || "blanco") === "negro" ? "#1f2937" : "#e2e8f0"
                      )}
                    </td>
                    <td style={celda}>
                      {i.cuentaId ? (
                        cuentas.find((c) => c.id === i.cuentaId)?.nombre || i.cuentaId
                      ) : (
                        <strong style={{ color: "#b91c1c" }}>⚠ falta la cuenta</strong>
                      )}
                    </td>
                    <td style={celdaDerecha}>
                      {i.montoRescatado != null
                        ? montoMoneda(i.montoRescatado, i.moneda)
                        : cerrada
                        ? montoMoneda(i.valorActual || 0, i.moneda)
                        : "al cerrarla"}
                    </td>
                    <td style={celda}>
                      {(RENGLONES_RESCATE_LABEL.find(([k]) => k === (i.renglonRescate || "")) || [])[1] || "—"}
                    </td>
                    <td style={celdaNoWrap}>
                      <FirmanteCelda value={i.firmante} firmadoEn={i.firmadoEn} />
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
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
    </>
  );
}
