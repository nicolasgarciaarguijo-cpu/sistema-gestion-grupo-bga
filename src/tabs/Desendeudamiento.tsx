// SOLAPA DESENDEUDAMIENTO (Nicolas, 2026-10-14): todas las deudas de la empresa en un lugar — planes de
// pago, prestamos externos, financiacion de equipos. Cada deuda es como un proveedor: acreedor, grupo de
// costo (donde van sus pagos en el cash flow) y las CUOTAS ESTIPULADAS. A cada cuota se le asigna el
// pago que la salda (uno nuevo o uno ya cargado): ese pago es el que llega al cash flow.
// Los prestamos entre socios o entre empresas NO van aca (son movimientos internos).
// Abajo, de referencia, las otras deudas que tiene el sistema y se manejan en su propia solapa.
import React, { useState } from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import type { DebtPlan } from "../domain/types";
import { FirmanteFijo } from "../ui/FirmanteSelect";
import {
  TIPOS_DEUDA,
  cuotasDeDeuda,
  cuotaPagada,
  generarCuotas,
  resumenDeuda,
  type CuotaDeuda,
  type EstadoCuota,
} from "../domain/desendeudamiento";

import NumInput from "../ui/NumInput";
import { OPCIONES_MEDIO_PAGO } from "../domain/types";
export type PagoCuotaForm = {
  modo: "nuevo" | "vincular";
  fecha: string;
  monto: number;
  metodo: "transferencia" | "efectivo" | "cheque" | "debito" | "tarjeta_debito" | "tarjeta_credito";
  cuentaId?: string;
  administration: "blanco" | "negro";
  costEntryId?: number;
};

export type OtraDeuda = { titulo: string; company: string; monto: number; detalle: string; tab: string };

const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 7px", fontSize: 13, width: "100%", boxSizing: "border-box", color: "#0f172a", background: "#fff" };
const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 11.5, color: "#475569", fontWeight: 600 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#475569", padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
// Boton chico de cada renglon (editar / borrar / pagar a la vista).
const btnFila: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 5, padding: "1px 7px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginLeft: 4, color: "#334155" };
const ESTADOS: Record<EstadoCuota, string> = { programado: "Programado", estimado: "Estimado", inamovible: "Inamovible" };

export function DesendeudamientoTab({
  deudas,
  hoy,
  companyOptions,
  grupos,
  acreedores,
  cuentas,
  money,
  etiquetaGrupo,
  pagoDeCuota,
  pagosVinculables,
  otrasDeudas,
  onAgregar,
  onActualizar,
  onBorrar,
  onRegistrarPago,
  onQuitarPago,
  onIr,
}: {
  deudas: DebtPlan[];
  hoy: string;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  grupos: Array<{ key: string; label: string }>;
  acreedores: string[];
  cuentas: Array<{ id: string; company: string; nombre: string; activa?: boolean }>;
  money: (n: number) => string;
  etiquetaGrupo: (clave: string) => string;
  pagoDeCuota: (costEntryId: number) => { date: string; amount: number; metodo: string } | null;
  pagosVinculables: (company: string, acreedor: string) => Array<{ id: number; date: string; amount: number; description: string }>;
  otrasDeudas: OtraDeuda[];
  onAgregar: () => number | void; // devuelve el id de la deuda nueva (se abre su ficha)
  onActualizar: (id: number, patch: Partial<DebtPlan>) => void;
  onBorrar: (id: number) => void;
  onRegistrarPago: (deudaId: number, cuotaId: string, pago: PagoCuotaForm) => void;
  onQuitarPago: (deudaId: number, cuotaId: string) => void;
  onIr: (tab: string) => void;
}) {
  const [menu, setMenu] = useState<null | { x: number; y: number; deudaId: number; cuotaId: string }>(null);
  const [pago, setPago] = useState<null | { deuda: DebtPlan; cuota: CuotaDeuda; form: PagoCuotaForm }>(null);
  const [estipular, setEstipular] = useState<Record<number, { fecha: string; cantidad: number; monto: number }>>({});
  // La deuda cuya ficha esta abierta.
  const [fichaId, setFichaId] = useState<number | null>(null);
  const fichaDeuda = fichaId != null ? deudas.find((d) => d.id === fichaId) : undefined;

  const activas = deudas.filter((d) => d.active);
  const resumenes = activas.map((d) => resumenDeuda(d, hoy));
  const totalPendiente = resumenes.reduce((a, r) => a + r.pendiente, 0);
  const vencidas = resumenes.reduce((a, r) => a + r.vencidas, 0);
  const mes = hoy.slice(0, 7);
  const delMes = activas.reduce(
    (a, d) => a + cuotasDeDeuda(d).filter((c) => !cuotaPagada(c) && c.fecha.startsWith(mes)).reduce((x, c) => x + Number(c.monto || 0), 0),
    0
  );

  const setCuotas = (d: DebtPlan, f: (cs: CuotaDeuda[]) => CuotaDeuda[]) => onActualizar(d.id, { cuotas: f(cuotasDeDeuda(d).map((c) => ({ ...c }))) });

  const abrirPago = (d: DebtPlan, c: CuotaDeuda) =>
    setPago({
      deuda: d,
      cuota: c,
      form: { modo: "nuevo", fecha: c.fecha <= hoy ? c.fecha : hoy, monto: Number(c.monto || 0), metodo: "transferencia", administration: d.administration || "blanco" },
    });

  const deudaMenu = menu ? deudas.find((d) => d.id === menu.deudaId) : undefined;
  const cuotaMenu = deudaMenu ? cuotasDeDeuda(deudaMenu).find((c) => c.id === menu!.cuotaId) : undefined;

  return (
    <div style={styles.column}>
      <Panel span="full" title="Desendeudamiento" actions={<ButtonLike onClick={() => { const id = onAgregar(); if (typeof id === "number") setFichaId(id); }}>+ Agregar deuda</ButtonLike>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 6 }}>
          <MiniMetric label="Deuda pendiente (cuotas impagas)" value={money(totalPendiente)} />
          <MiniMetric label="A pagar este mes" value={money(delMes)} />
          <MiniMetric label="Cuotas vencidas sin pago" value={String(vencidas)} />
          <MiniMetric label="Deudas activas" value={String(activas.length)} />
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Cada deuda va como un proveedor: sus pagos entran al cash flow en EGRESOS · PROVEEDORES, en el grupo de costo elegido y con el nombre del acreedor. Las cuotas pendientes van a la agenda de pagos inamovibles. Los préstamos entre socios o entre las empresas van en Movimientos internos.
        </div>
      </Panel>

      {deudas.length === 0 && (
        <Panel span="full" title="Sin deudas cargadas">
          <div style={{ fontSize: 13, color: "#64748b" }}>Tocá "+ Agregar deuda" para cargar un plan de pago, un préstamo o una financiación.</div>
        </Panel>
      )}

      {/* EL LISTADO de deudas: cada una abre su FICHA (Nicolas, 2026-10-20: "que se vea como una ficha similar a
          la de Pago a proveedores; cada deuda tiene una ficha donde se cargan las cuotas y los pagos"). */}
      {deudas.length > 0 && (
        <Panel span="full" title={`Deudas (${deudas.length})`}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Deuda</th>
                <th style={th}>Empresa</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={{ ...th, textAlign: "right" }}>Pagado</th>
                <th style={{ ...th, textAlign: "right" }}>Pendiente</th>
                <th style={th}>Próxima cuota</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {[...deudas]
                .sort((a, b) => Number(b.active) - Number(a.active) || (a.concept || "").localeCompare(b.concept || ""))
                .map((d) => {
                  const r = resumenDeuda(d, hoy);
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setFichaId(d.id)}
                      title="Click: abrir la ficha de la deuda (cuotas y pagos)"
                      style={{ cursor: "pointer", opacity: d.active ? 1 : 0.5, background: r.vencidas > 0 ? "#fef2f2" : undefined }}
                    >
                      <td style={{ ...td, fontWeight: 700 }}>
                        {d.concept || "Deuda sin nombre"}
                        {d.acreedor ? <span style={{ fontWeight: 400, color: "#64748b" }}> · {d.acreedor}</span> : null}
                        {!d.active && <span style={{ fontSize: 11, color: "#94a3b8" }}> · inactiva</span>}
                      </td>
                      <td style={td}>{companyOptions.find((c) => c.value === d.company)?.short || d.company}</td>
                      <td style={{ ...td, textAlign: "right" }}>{money(r.total)}</td>
                      <td style={{ ...td, textAlign: "right", color: "#166534" }}>{money(r.pagado)} <span style={{ fontSize: 11, color: "#94a3b8" }}>({r.cuotasPagadas})</span></td>
                      <td style={{ ...td, textAlign: "right", color: "#b45309", fontWeight: 700 }}>{money(r.pendiente)} <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>({r.cuotasPendientes})</span></td>
                      <td style={{ ...td, fontSize: 12.5 }}>
                        {r.proxima ? `${r.proxima.fecha.slice(8, 10)}/${r.proxima.fecha.slice(5, 7)}/${r.proxima.fecha.slice(0, 4)} · ${money(r.proxima.monto)}` : r.cuotas === 0 ? <span style={{ color: "#b45309" }}>sin cuotas: abrí la ficha y estipulalas</span> : "—"}
                        {r.vencidas > 0 && <span style={{ color: "#b91c1c", fontWeight: 700 }}> · ⚠ {r.vencidas} vencida(s)</span>}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <button type="button" style={btnFila} onClick={() => setFichaId(d.id)}>✎ Abrir ficha</button>
                        <button
                          type="button"
                          style={{ ...btnFila, color: "#b91c1c", borderColor: "#fecaca" }}
                          title="Borrar"
                          onClick={() => {
                            if (window.confirm(`¿Quitar la deuda "${d.concept}"? Los pagos ya cargados quedan.`)) onBorrar(d.id);
                          }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel span="full" title="Otras deudas del sistema (se manejan en su solapa)">
        {otrasDeudas.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>No hay otras deudas pendientes.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Deuda</th>
                <th style={th}>Empresa</th>
                <th style={{ ...th, textAlign: "right" }}>Monto</th>
                <th style={th}>Detalle</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {otrasDeudas.map((o, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.titulo}</td>
                  <td style={td}>{o.company}</td>
                  <td style={{ ...td, textAlign: "right" }}>{money(o.monto)}</td>
                  <td style={{ ...td, color: "#64748b", fontSize: 12 }}>{o.detalle}</td>
                  <td style={td}>
                    <ButtonLike onClick={() => onIr(o.tab)}>Ir</ButtonLike>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>


      {/* LA FICHA DE LA DEUDA: datos, cuotas (con su pago) y el historial de pagos. */}
      {fichaDeuda && (() => {
        const d = fichaDeuda;
        const cuotas = cuotasDeDeuda(d);
        const r = resumenDeuda(d, hoy);
        const est = estipular[d.id] || { fecha: r.proxima?.fecha || hoy, cantidad: 12, monto: Number(d.nextInstallmentAmount || 0) };
        const pagos = cuotas
          .filter(cuotaPagada)
          .map((c) => ({ c, p: pagoDeCuota(c.pagoCostEntryId as number) }))
          .sort((a, b) => (b.p?.date || "").localeCompare(a.p?.date || ""));
        return (
          <div onClick={() => setFichaId(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4500, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(960px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800 }}>{d.concept || "Deuda sin nombre"}{d.acreedor ? ` · ${d.acreedor}` : ""}</div>
                  <div style={{ fontSize: 12.5, color: "#64748b" }}>{companyOptions.find((c) => c.value === d.company)?.short || d.company} · ficha de la deuda: cuotas y pagos</div>
                </div>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, flexWrap: "wrap" }}>
                  {r.proxima && (
                    <button type="button" style={{ ...btnFila, background: "#16a34a", color: "#fff", borderColor: "#15803d", padding: "5px 10px" }} onClick={() => abrirPago(d, r.proxima!)}>
                      💸 Pagar la próxima cuota ({money(r.proxima.monto)})
                    </button>
                  )}
                  <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <input type="checkbox" checked={d.active} onChange={(e) => onActualizar(d.id, { active: e.target.checked })} /> activa
                  </label>
                  <button
                    type="button"
                    style={{ ...btnFila, color: "#b91c1c", borderColor: "#fecaca", padding: "5px 10px" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar la deuda "${d.concept}"? Los pagos ya cargados quedan.`)) {
                        onBorrar(d.id);
                        setFichaId(null);
                      }
                    }}
                  >
                    🗑 Quitar deuda
                  </button>
                  <button type="button" style={{ ...btnFila, padding: "5px 10px" }} onClick={() => setFichaId(null)}>Cerrar</button>
                </span>
              </div>
            <div style={{ opacity: d.active ? 1 : 0.55, display: "grid", gap: 10 }}>
                <div style={grid}>
                  <label style={lbl}>Concepto
                    <input style={input} value={d.concept} onChange={(e) => onActualizar(d.id, { concept: e.target.value })} />
                  </label>
                  <label style={lbl}>Acreedor (a quién se le debe)
                    <input style={input} list="desend-acreedores" value={d.acreedor || ""} onChange={(e) => onActualizar(d.id, { acreedor: e.target.value })} />
                  </label>
                  <label style={lbl}>Tipo
                    <select style={input} value={d.tipo || "otra"} onChange={(e) => onActualizar(d.id, { tipo: e.target.value as any })}>
                      {TIPOS_DEUDA.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={lbl}>Empresa
                    <select style={input} value={d.company} onChange={(e) => onActualizar(d.id, { company: e.target.value as any })}>
                      {companyOptions.filter((c) => c.value !== "General").map((c) => (
                        <option key={c.value} value={c.value}>{c.label || c.value}</option>
                      ))}
                    </select>
                  </label>
                  <label style={lbl}>Grupo de costo (dónde va en el cash flow)
                    <select style={input} value={d.grupoCosto || ""} onChange={(e) => onActualizar(d.id, { grupoCosto: e.target.value || undefined })}>
                      <option value="">— Sin grupo —</option>
                      {grupos.map((g) => (
                        <option key={g.key} value={g.key}>{g.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={lbl}>Circuito
                    <select
                      style={{ ...input, background: d.administration === "negro" ? "#1f2937" : "#fff", color: d.administration === "negro" ? "#fff" : "#0f172a" }}
                      value={d.administration || "blanco"}
                      onChange={(e) => onActualizar(d.id, { administration: e.target.value as any })}
                    >
                      <option value="blanco">Blanco</option>
                      <option value="negro">Negro</option>
                    </select>
                  </label>
                  <label style={lbl}>Capital original
                    <NumInput style={input} value={d.capital || ""} onChange={(e) => onActualizar(d.id, { capital: Number(e.target.value) || 0 })} />
                  </label>
                  <label style={lbl}>U$S por cuota (referencia)
                    <NumInput style={input} value={d.usdValuePerInstallment || ""} onChange={(e) => onActualizar(d.id, { usdValuePerInstallment: Number(e.target.value) || 0 })} />
                  </label>
                </div>
                <label style={lbl}>Notas
                  <input style={input} value={d.notes} onChange={(e) => onActualizar(d.id, { notes: e.target.value })} />
                </label>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
                  <span>Total: <b>{money(r.total)}</b></span>
                  <span style={{ color: "#166534" }}>Pagado: <b>{money(r.pagado)}</b> ({r.cuotasPagadas})</span>
                  <span style={{ color: "#b45309" }}>Pendiente: <b>{money(r.pendiente)}</b> ({r.cuotasPendientes})</span>
                  {r.vencidas > 0 && <span style={{ color: "#b91c1c", fontWeight: 700 }}>⚠ {r.vencidas} vencida(s) sin pago</span>}
                  {d.grupoCosto && <span style={{ color: "#475569" }}>Va a: <b>{etiquetaGrupo(d.grupoCosto)}</b></span>}
                </div>

                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 50 }}>N.º</th>
                      <th style={{ ...th, width: 150 }}>Vencimiento</th>
                      <th style={{ ...th, width: 150, textAlign: "right" }}>Monto</th>
                      <th style={{ ...th, width: 110 }}>Estado</th>
                      <th style={th}>Pago</th>
                      <th style={{ ...th, width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuotas.length === 0 && (
                      <tr>
                        <td style={{ ...td, color: "#94a3b8" }} colSpan={6}>Sin cuotas: estipulalas abajo.</td>
                      </tr>
                    )}
                    {cuotas.map((c) => {
                      const pagada = cuotaPagada(c);
                      const p = pagada ? pagoDeCuota(c.pagoCostEntryId as number) : null;
                      const vencida = !pagada && c.fecha < hoy;
                      return (
                        <tr
                          key={c.id}
                          onContextMenu={(ev) => {
                            ev.preventDefault();
                            setMenu({ x: ev.clientX, y: ev.clientY, deudaId: d.id, cuotaId: c.id });
                          }}
                          title="Click derecho: más opciones"
                          style={{ background: pagada ? "#f0fdf4" : vencida ? "#fef2f2" : undefined }}
                        >
                          <td style={td}>{c.numero}</td>
                          <td style={td}>
                            <input
                              style={{ ...input, padding: "2px 5px" }}
                              type="date"
                              value={c.fecha}
                              disabled={pagada}
                              onChange={(e) => setCuotas(d, (cs) => cs.map((x) => (x.id === c.id ? { ...x, fecha: e.target.value } : x)))}
                            />
                          </td>
                          <td style={td}>
                            <NumInput
                              style={{ ...input, padding: "2px 5px", textAlign: "right" }}
                              value={c.monto || ""}
                              disabled={pagada}
                              onChange={(e) => setCuotas(d, (cs) => cs.map((x) => (x.id === c.id ? { ...x, monto: Number(e.target.value) || 0 } : x)))}
                            />
                          </td>
                          <td style={{ ...td, fontSize: 12 }}>
                            <select
                              style={{ ...input, padding: "2px 4px", fontSize: 12 }}
                              value={c.estado || "programado"}
                              disabled={pagada}
                              onChange={(e) => setCuotas(d, (cs) => cs.map((x) => (x.id === c.id ? { ...x, estado: e.target.value as EstadoCuota } : x)))}
                            >
                              {(Object.keys(ESTADOS) as EstadoCuota[]).map((k) => (
                                <option key={k} value={k}>{ESTADOS[k]}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ ...td, fontSize: 12.5 }}>
                            {pagada ? (
                              <span style={{ color: "#166534", fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                ✓ Pagada{p ? ` el ${p.date.slice(8, 10)}/${p.date.slice(5, 7)}/${p.date.slice(0, 4)} · ${money(p.amount)} · ${p.metodo}` : ""}
                                <button
                                  type="button"
                                  style={{ ...btnFila, color: "#b91c1c", borderColor: "#fecaca", fontWeight: 600 }}
                                  title="Desvincular el pago (el pago queda cargado; la cuota vuelve a pendiente)"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (window.confirm("¿Desvincular el pago de esta cuota? El pago queda cargado; la cuota vuelve a pendiente.")) onQuitarPago(d.id, c.id);
                                  }}
                                >
                                  ↩
                                </button>
                              </span>
                            ) : (
                              <span style={{ color: vencida ? "#b91c1c" : "#64748b", display: "inline-flex", gap: 6, alignItems: "center" }}>
                                {vencida ? "Vencida sin pago" : "Pendiente"}
                                <button
                                  type="button"
                                  style={{ ...btnFila, background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    abrirPago(d, c);
                                  }}
                                >
                                  💸 Asignar pago
                                </button>
                              </span>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            {/* Quitar a la vista: igual que el menú, solo si la cuota no está pagada. */}
                            {!pagada && (
                              <button
                                type="button"
                                title="Borrar"
                                style={{ padding: "0 6px", fontSize: 12, lineHeight: "18px", color: "#b91c1c", background: "#fff", border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer" }}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (window.confirm(`¿Borrar la cuota ${c.numero}?`)) setCuotas(d, (cs) => cs.filter((x) => x.id !== c.id));
                                }}
                              >
                                🗑
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", fontSize: 12 }}>
                  <b style={{ color: "#475569" }}>Estipular cuotas:</b>
                  <label style={lbl}>Primera
                    <input style={input} type="date" value={est.fecha} onChange={(e) => setEstipular((p) => ({ ...p, [d.id]: { ...est, fecha: e.target.value } }))} />
                  </label>
                  <label style={lbl}>Cantidad
                    <NumInput style={{ ...input, width: 80 }} value={est.cantidad} onChange={(e) => setEstipular((p) => ({ ...p, [d.id]: { ...est, cantidad: Number(e.target.value) || 0 } }))} />
                  </label>
                  <label style={lbl}>Monto por cuota
                    <NumInput style={{ ...input, width: 130 }} value={est.monto || ""} onChange={(e) => setEstipular((p) => ({ ...p, [d.id]: { ...est, monto: Number(e.target.value) || 0 } }))} />
                  </label>
                  <ButtonLike
                    onClick={() => {
                      if (!est.fecha || !(est.cantidad > 0)) return;
                      setCuotas(d, (cs) => {
                        const desde = cs.reduce((m, x) => Math.max(m, x.numero), 0) + 1;
                        return [...cs, ...generarCuotas(est.fecha, est.cantidad, est.monto, desde, `${d.id}-`)];
                      });
                    }}
                  >
                    Agregar cuotas
                  </ButtonLike>
                  <ButtonLike
                    onClick={() => {
                      if (!window.confirm("¿Reemplazar las cuotas PENDIENTES por este cronograma? Las pagadas quedan.")) return;
                      setCuotas(d, (cs) => {
                        const pagadas = cs.filter(cuotaPagada);
                        const desde = pagadas.reduce((m, x) => Math.max(m, x.numero), 0) + 1;
                        return [...pagadas, ...generarCuotas(est.fecha, est.cantidad, est.monto, desde, `${d.id}-r${Date.now() % 100000}-`)];
                      });
                    }}
                  >
                    Rehacer pendientes
                  </ButtonLike>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Historial de pagos ({pagos.length})</div>
                {pagos.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#64748b" }}>Todavía no se pagó ninguna cuota.</div>
                ) : (
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <tbody>
                      {pagos.map(({ c, p }) => (
                        <tr key={c.id}>
                          <td style={{ ...td, whiteSpace: "nowrap", color: "#475569" }}>{p ? `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}/${p.date.slice(0, 4)}` : "—"}</td>
                          <td style={td}>Cuota {c.numero}{p ? ` · ${p.metodo}` : ""}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#166534" }}>{money(p ? p.amount : c.monto)}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <button
                              type="button"
                              style={{ ...btnFila, color: "#b91c1c", borderColor: "#fecaca" }}
                              title="Desvincular el pago de la cuota (el pago queda cargado)"
                              onClick={() => {
                                if (window.confirm("¿Desvincular el pago de esta cuota? El pago queda cargado; la cuota vuelve a pendiente.")) onQuitarPago(d.id, c.id);
                              }}
                            >
                              ↩ Desvincular
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <datalist id="desend-acreedores">
        {acreedores.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {menu && deudaMenu && cuotaMenu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{`Cuota ${cuotaMenu.numero} · ${money(cuotaMenu.monto)}`}</QuickMenuTitle>
          {!cuotaPagada(cuotaMenu) ? (
            <button
              style={quickMenuItem}
              onClick={() => {
                abrirPago(deudaMenu, cuotaMenu);
                setMenu(null);
              }}
            >
              💸 Asignar el pago…
            </button>
          ) : (
            <button
              style={quickMenuItem}
              onClick={() => {
                if (window.confirm("¿Desvincular el pago de esta cuota? El pago queda cargado; la cuota vuelve a pendiente.")) onQuitarPago(deudaMenu.id, cuotaMenu.id);
                setMenu(null);
              }}
            >
              ↩ Desvincular el pago
            </button>
          )}
          <QuickMenuSep />
          {(Object.keys(ESTADOS) as EstadoCuota[]).map((e) => (
            <button
              key={e}
              style={{ ...quickMenuItem, fontWeight: (cuotaMenu.estado || "programado") === e ? 800 : 400 }}
              onClick={() => {
                setCuotas(deudaMenu, (cs) => cs.map((x) => (x.id === cuotaMenu.id ? { ...x, estado: e } : x)));
                setMenu(null);
              }}
            >
              {ESTADOS[e]}
            </button>
          ))}
          <QuickMenuSep />
          {!cuotaPagada(cuotaMenu) && (
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                setCuotas(deudaMenu, (cs) => cs.filter((x) => x.id !== cuotaMenu.id));
                setMenu(null);
              }}
            >
              Quitar la cuota
            </button>
          )}
        </QuickMenu>
      )}

      {pago && (
        <div onClick={() => setPago(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4600, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 12px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(560px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              Pago de la cuota {pago.cuota.numero} · {pago.deuda.concept}
              {pago.deuda.acreedor ? ` · ${pago.deuda.acreedor}` : ""}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="radio" checked={pago.form.modo === "nuevo"} onChange={() => setPago({ ...pago, form: { ...pago.form, modo: "nuevo" } })} /> Cargar el pago
              </label>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="radio" checked={pago.form.modo === "vincular"} onChange={() => setPago({ ...pago, form: { ...pago.form, modo: "vincular" } })} /> Vincular un pago ya cargado
              </label>
            </div>
            {pago.form.modo === "nuevo" ? (
              <div style={grid}>
                <label style={lbl}>Fecha
                  <input style={input} type="date" value={pago.form.fecha} onChange={(e) => setPago({ ...pago, form: { ...pago.form, fecha: e.target.value } })} />
                </label>
                <label style={lbl}>Monto
                  <NumInput style={input} value={pago.form.monto || ""} onChange={(e) => setPago({ ...pago, form: { ...pago.form, monto: Number(e.target.value) || 0 } })} />
                </label>
                <label style={lbl}>Medio de pago
                  <select style={input} value={pago.form.metodo} onChange={(e) => setPago({ ...pago, form: { ...pago.form, metodo: e.target.value as any } })}>
                    {OPCIONES_MEDIO_PAGO.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label style={lbl}>De qué cuenta
                  <select style={{ ...input, ...(pago.form.cuentaId ? {} : { borderColor: "#f87171", background: "#fef2f2" }) }} value={pago.form.cuentaId || ""} onChange={(e) => setPago({ ...pago, form: { ...pago.form, cuentaId: e.target.value || undefined } })}>
                    <option value="">— Elegí la cuenta —</option>
                    {cuentas
                      .filter((c) => c.company === pago.deuda.company && c.activa !== false)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                  </select>
                </label>
                <label style={lbl}>Circuito
                  <select style={input} value={pago.form.administration} onChange={(e) => setPago({ ...pago, form: { ...pago.form, administration: e.target.value as any } })}>
                    <option value="blanco">Blanco</option>
                    <option value="negro">Negro</option>
                  </select>
                </label>
                <FirmanteFijo labelStyle={lbl} />
              </div>
            ) : (
              <label style={lbl}>Pago ya cargado (de {pago.deuda.acreedor || "este acreedor"})
                <select style={input} value={pago.form.costEntryId ?? ""} onChange={(e) => setPago({ ...pago, form: { ...pago.form, costEntryId: e.target.value ? Number(e.target.value) : undefined } })}>
                  <option value="">— Elegí el pago —</option>
                  {pagosVinculables(pago.deuda.company, pago.deuda.acreedor || "").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.date} · {money(p.amount)} · {p.description}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div style={{ fontSize: 12, color: "#64748b" }}>
              El pago va al cash flow como pago a {pago.deuda.acreedor || "el acreedor"}
              {pago.deuda.grupoCosto ? `, en ${etiquetaGrupo(pago.deuda.grupoCosto)}` : " (sin grupo: elegilo en la deuda)"}. Si sale del banco, lo cuenta el débito del extracto (no se duplica).
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <ButtonLike onClick={() => setPago(null)}>Cancelar</ButtonLike>
              <ButtonLike
                onClick={() => {
                  const f = pago.form;
                  if (f.modo === "nuevo" && (!f.fecha || !(f.monto > 0))) return window.alert("Falta la fecha o el monto del pago.");
                  if (f.modo === "nuevo" && !f.cuentaId) return window.alert("Elegí de qué cuenta sale el pago.");
                  if (f.modo === "vincular" && f.costEntryId == null) return window.alert("Elegí el pago a vincular.");
                  onRegistrarPago(pago.deuda.id, pago.cuota.id, f);
                  setPago(null);
                }}
              >
                Guardar pago
              </ButtonLike>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
