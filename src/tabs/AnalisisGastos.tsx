// ANALISIS DE GASTOS: todos los egresos del sistema agrupados (personal, empresariales, funcionamiento,
// materiales, bancos y tarjetas, deudas, seguros, caja chica y viaticos), con blanco y negro SEPARADOS,
// fijo / variable, y lo que viene (programado / estimado / inamovible) aparte. Ver domain/analisisGastos.
import React, { useMemo, useState } from "react";
import { Panel, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { analizarGastos, type Egreso, type EstadoGasto, type Totales } from "../domain/analisisGastos";

const ESTADO_COLOR: Record<EstadoGasto, { fg: string; bg: string; label: string }> = {
  realizado: { fg: "#166534", bg: "#dcfce7", label: "Realizado" },
  programado: { fg: "#0f766e", bg: "#ccfbf1", label: "Programado" },
  estimado: { fg: "#7c3aed", bg: "#ede9fe", label: "Estimado" },
  inamovible: { fg: "#dc2626", bg: "#fee2e2", label: "Inamovible" },
};

const mesActual = () => new Date().toISOString().slice(0, 7);
const sumarMes = (mes: string, delta: number) => {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};
const ultimoDia = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const th: React.CSSProperties = { textAlign: "right", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { textAlign: "right", padding: "5px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const pill = (fg: string, bg: string): React.CSSProperties => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: fg, background: bg });

// De que solapa viene cada pago -> a donde ir con "Ir a la solapa".
const TAB_DE_FUENTE: Record<string, { tab: string; label: string }> = {
  Banco: { tab: "bancos", label: "Bancos y tarjetas" },
  Tarjetas: { tab: "bancos", label: "Bancos y tarjetas" },
  "Pago a proveedores": { tab: "costos", label: "Pago a proveedores" },
  Comisiones: { tab: "aprobados", label: "Trabajos aprobados" },
  "Caja chica": { tab: "cajaChica", label: "Caja chica y viáticos" },
  Haberes: { tab: "personal", label: "Personal" },
  Seguros: { tab: "seguros", label: "Seguros" },
  Deudas: { tab: "cashflow", label: "Balance (deudas)" },
  "Cargado en el cash flow": { tab: "calendarioAnual", label: "Calendario anual" },
  Vencimiento: { tab: "calendarioAnual", label: "Calendario anual" },
};

type Menu =
  | { x: number; y: number; tipo: "renglon"; conceptKey: string; renglon: string }
  | { x: number; y: number; tipo: "item"; egreso: Egreso };

export function AnalisisGastos({
  egresos,
  companyOptions,
  money,
  fvPorRenglon = {},
  onFVRenglon,
  onFVPago,
  onEstadoPrevisto,
  onIrA,
}: {
  egresos: Egreso[];
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  money: (n: number, currency?: string) => string;
  fvPorRenglon?: Record<string, { kind: "fijo" | "variable"; locked: boolean }>;
  onFVRenglon?: (conceptKey: string, kind: "fijo" | "variable" | null, locked: boolean) => void;
  onFVPago?: (entryId: string, kind: "fijo" | "variable" | undefined) => boolean;
  onEstadoPrevisto?: (clave: string, estado: "programado" | "estimado" | "inamovible") => void;
  onIrA?: (tab: string) => void;
}) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [aviso, setAviso] = useState("");
  const [mes, setMes] = useState(mesActual());
  const [empresa, setEmpresa] = useState<string>("__ALL__");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setAbiertos((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const enScope = useMemo(
    () => egresos.filter((e) => empresa === "__ALL__" || e.company === empresa),
    [egresos, empresa]
  );
  const a = useMemo(() => analizarGastos(enScope, `${mes}-01`, ultimoDia(mes)), [enScope, mes]);
  const [y, m] = mes.split("-").map(Number);
  const empresas = companyOptions.filter((c) => c.value !== "General");
  const shortDe = (company: string) => empresas.find((c) => c.value === company)?.short || company.slice(0, 8);

  const celdas = (t: Totales, previsto: number, fuerte = false) => (
    <>
      <td style={{ ...td, fontWeight: fuerte ? 700 : 400 }}>{t.blanco ? money(t.blanco) : "—"}</td>
      <td style={{ ...td, fontWeight: fuerte ? 700 : 400, color: "#334155" }}>{t.negro ? money(t.negro) : "—"}</td>
      <td style={{ ...td, fontWeight: 700 }}>{t.total ? money(t.total) : "—"}</td>
      <td style={{ ...td, color: "#1d4ed8" }}>{t.fijo ? money(t.fijo) : "—"}</td>
      <td style={{ ...td, color: "#b45309" }}>{t.variable ? money(t.variable) : "—"}</td>
      <td style={{ ...td, color: "#94a3b8" }}>{t.sinFV ? money(t.sinFV) : "—"}</td>
      <td style={{ ...td, color: "#0f766e", fontStyle: previsto ? "italic" : undefined }}>{previsto ? `≈ ${money(previsto)}` : "—"}</td>
    </>
  );

  return (
    <Panel
      span="full"
      title="Análisis de gastos · todos los egresos del sistema"
      actions={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" style={btn} onClick={() => setMes(sumarMes(mes, -1))}>◀</button>
          <strong style={{ minWidth: 120, textAlign: "center" }}>{NOMBRE_MES[m - 1]} {y}</strong>
          <button type="button" style={btn} onClick={() => setMes(sumarMes(mes, 1))}>▶</button>
          <select style={{ ...btn, padding: "4px 6px" }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="__ALL__">Todas las empresas</option>
            {empresas.map((c) => (
              <option key={c.value} value={c.value}>{c.label || c.value}</option>
            ))}
          </select>
        </span>
      }
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        Se arma solo con lo que ya está cargado en el sistema (cada pago, cargado en la solapa que sea, con su
        renglón del Calendario). <strong>Solo lo realizado suma.</strong> Lo programado, estimado e inamovible va
        en la última columna. Blanco y negro siempre separados; los dólares, aparte.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {[
          ["Gastado en el mes", money(a.total.total), "#0f172a"],
          ["Blanco", money(a.total.blanco), "#0f172a"],
          ["Negro", money(a.total.negro), "#334155"],
          ["Fijos", money(a.total.fijo), "#1d4ed8"],
          ["Variables", money(a.total.variable), "#b45309"],
          ["Sin definir F/V", money(a.total.sinFV), "#94a3b8"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", minWidth: 120 }}>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>Lo que viene en el mes</div>
          <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            {(["programado", "estimado", "inamovible"] as const).map((k) => (
              <span key={k} style={pill(ESTADO_COLOR[k].fg, ESTADO_COLOR[k].bg)}>
                {ESTADO_COLOR[k].label} {money(a.previsto[k])}
              </span>
            ))}
          </div>
        </div>
        {a.totalUsd.total > 0 && (
          <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11.5, color: "#065f46" }}>En dólares (aparte)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46" }}>{money(a.totalUsd.total, "USD")}</div>
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Grupo de gasto</th>
              <th style={th}>Blanco</th>
              <th style={th}>Negro</th>
              <th style={th}>Total</th>
              <th style={th}>Fijo</th>
              <th style={th}>Variable</th>
              <th style={th}>Sin F/V</th>
              <th style={th}>Previsto</th>
            </tr>
          </thead>
          <tbody>
            {a.grupos
              .filter((g) => g.realizado.total > 0 || g.previsto > 0 || g.usd.total > 0)
              .map((g) => {
                const abierto = abiertos.has(g.key);
                return (
                  <React.Fragment key={g.key}>
                    <tr
                      onClick={() => toggle(g.key)}
                      style={{ cursor: "pointer", background: g.key === "sinClasificar" ? "#fffbeb" : "#f8fafc" }}
                      title={g.detalle}
                    >
                      <td style={{ ...td, textAlign: "left", fontWeight: 800 }}>
                        {abierto ? "▾ " : "▸ "}
                        {g.label}
                        {g.usd.total > 0 && <span style={{ ...pill("#065f46", "#d1fae5"), marginLeft: 6 }}>+ {money(g.usd.total, "USD")}</span>}
                      </td>
                      {celdas(g.realizado, g.previsto, true)}
                    </tr>
                    {abierto &&
                      g.renglones.map((r) => {
                        const kr = `${g.key}|${r.renglon}`;
                        const rAbierto = abiertos.has(kr);
                        return (
                          <React.Fragment key={kr}>
                            <tr
                              onClick={() => toggle(kr)}
                              onContextMenu={(ev) => {
                                const ck = r.items.find((i) => i.conceptKey)?.conceptKey || "";
                                if (!ck) return;
                                ev.preventDefault();
                                setMenu({ x: ev.clientX, y: ev.clientY, tipo: "renglon", conceptKey: ck, renglon: r.renglon });
                              }}
                              style={{ cursor: "pointer" }}
                              title="Click: ver cada pago · Click derecho: fijo / variable del tipo de gasto (con candado)"
                            >
                              <td style={{ ...td, textAlign: "left", paddingLeft: 26 }}>
                                {rAbierto ? "▾ " : "▸ "}
                                {r.renglon} <span style={{ color: "#94a3b8" }}>({r.items.length})</span>
                                {(() => {
                                  const cfg = fvPorRenglon[r.items.find((i) => i.conceptKey)?.conceptKey || ""];
                                  if (!cfg) return null;
                                  return (
                                    <span style={{ ...pill(cfg.kind === "fijo" ? "#1d4ed8" : "#b45309", cfg.kind === "fijo" ? "#dbeafe" : "#fef3c7"), marginLeft: 6 }}>
                                      {cfg.kind === "fijo" ? "F" : "V"}{cfg.locked ? " 🔒" : ""}
                                    </span>
                                  );
                                })()}
                              </td>
                              {celdas(r.realizado, r.previsto)}
                            </tr>
                            {rAbierto &&
                              r.items.map((e) => (
                                <tr
                                  key={e.id}
                                  style={{ background: "#fcfcfd", cursor: "context-menu" }}
                                  title="Click derecho: fijo / variable, estado, ir a la solapa"
                                  onContextMenu={(ev) => {
                                    ev.preventDefault();
                                    setMenu({ x: ev.clientX, y: ev.clientY, tipo: "item", egreso: e });
                                  }}
                                >
                                  <td style={{ ...td, textAlign: "left", paddingLeft: 46, color: "#475569" }} colSpan={1} title={e.titulo}>
                                    <span style={{ color: "#94a3b8", marginRight: 6 }}>{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
                                    {e.titulo.length > 46 ? e.titulo.slice(0, 46) + "…" : e.titulo}
                                    <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>· {e.fuente} · {shortDe(e.company)}</span>
                                  </td>
                                  <td style={td} colSpan={2}>
                                    <span style={pill(e.administracion === "negro" ? "#ffffff" : "#334155", e.administracion === "negro" ? "#1f2937" : "#e2e8f0")}>
                                      {e.administracion === "negro" ? "N" : "B"}
                                    </span>{" "}
                                    {e.fv ? (
                                      <span style={pill(e.fv === "fijo" ? "#1d4ed8" : "#b45309", e.fv === "fijo" ? "#dbeafe" : "#fef3c7")}>{e.fv === "fijo" ? "F" : "V"}</span>
                                    ) : null}
                                  </td>
                                  <td style={{ ...td, fontWeight: 600 }}>
                                    {e.estado === "realizado" ? money(e.monto, e.moneda) : <span style={{ fontStyle: "italic", color: ESTADO_COLOR[e.estado].fg }}>≈ {money(e.monto, e.moneda)}</span>}
                                  </td>
                                  <td style={td} colSpan={4}>
                                    <span style={pill(ESTADO_COLOR[e.estado].fg, ESTADO_COLOR[e.estado].bg)}>{ESTADO_COLOR[e.estado].label}</span>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            <tr style={{ borderTop: "2px solid #cbd5e1" }}>
              <td style={{ ...td, textAlign: "left", fontWeight: 800 }}>Total del mes</td>
              {celdas(a.total, a.previsto.programado + a.previsto.estimado + a.previsto.inamovible, true)}
            </tr>
          </tbody>
        </table>
      </div>
      {aviso && <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>{aviso}</div>}
      {menu && (() => {
        const close = () => setMenu(null);
        if (menu.tipo === "renglon") {
          const actual = fvPorRenglon[menu.conceptKey];
          const fijar = (kind: "fijo" | "variable" | null, locked: boolean) => {
            onFVRenglon?.(menu.conceptKey, kind, locked);
            close();
          };
          return (
            <QuickMenu x={menu.x} y={menu.y} onClose={close}>
              <QuickMenuTitle>Tipo de gasto · {menu.renglon}</QuickMenuTitle>
              <div style={{ fontSize: 11, color: "#64748b", padding: "4px 8px" }}>
                {actual
                  ? `${actual.kind === "fijo" ? "FIJO" : "VARIABLE"}${actual.locked ? " 🔒 (todos sus pagos)" : " (sugerencia; cada pago puede cambiar)"}`
                  : "Sin definir"}
              </div>
              {onFVRenglon && (
                <>
                  <button style={quickMenuItem} onClick={() => fijar("fijo", actual?.locked || false)}>Fijo</button>
                  <button style={quickMenuItem} onClick={() => fijar("variable", actual?.locked || false)}>Variable</button>
                  {actual && (
                    <button style={{ ...quickMenuItem, fontWeight: 700 }} onClick={() => fijar(actual.kind, !actual.locked)}>
                      {actual.locked ? "🔓 Quitar candado" : "🔒 Candado: todos los pagos de este tipo"}
                    </button>
                  )}
                  {actual && (
                    <button style={{ ...quickMenuItem, color: "#94a3b8" }} onClick={() => fijar(null, false)}>
                      Sacar fijo/variable
                    </button>
                  )}
                </>
              )}
            </QuickMenu>
          );
        }
        const e = menu.egreso;
        const destino = TAB_DE_FUENTE[e.fuente];
        const bloqueado = fvPorRenglon[e.conceptKey]?.locked;
        const fvPago = (kind: "fijo" | "variable" | undefined) => {
          const ok = onFVPago?.(e.id, kind);
          setAviso(ok ? "" : `Este pago (${e.fuente}) se marca con el candado de su tipo de gasto o desde su solapa.`);
          close();
        };
        return (
          <QuickMenu x={menu.x} y={menu.y} onClose={close}>
            <QuickMenuTitle>
              {e.titulo.slice(0, 40)} · {money(e.monto, e.moneda)}
            </QuickMenuTitle>
            {e.estado === "realizado" ? (
              bloqueado ? (
                <div style={{ fontSize: 11, color: "#64748b", padding: "4px 8px" }}>
                  Fijo/variable bloqueado 🔒 por su tipo de gasto ({e.renglon}).
                </div>
              ) : (
                onFVPago && (
                  <>
                    <button style={quickMenuItem} onClick={() => fvPago("fijo")}>Este pago es fijo</button>
                    <button style={quickMenuItem} onClick={() => fvPago("variable")}>Este pago es variable</button>
                    {e.fv && (
                      <button style={{ ...quickMenuItem, color: "#94a3b8" }} onClick={() => fvPago(undefined)}>
                        Sacar fijo/variable
                      </button>
                    )}
                  </>
                )
              )
            ) : (
              onEstadoPrevisto &&
              (["programado", "estimado", "inamovible"] as const).map((k) => (
                <button
                  key={k}
                  style={{ ...quickMenuItem, color: ESTADO_COLOR[k].fg, fontWeight: e.estado === k ? 800 : 500 }}
                  onClick={() => {
                    onEstadoPrevisto(e.id.replace(/^prev-/, ""), k);
                    close();
                  }}
                >
                  {e.estado === k ? "● " : ""}
                  {ESTADO_COLOR[k].label}
                </button>
              ))
            )}
            {destino && onIrA && (
              <>
                <QuickMenuSep />
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    onIrA(destino.tab);
                    close();
                  }}
                >
                  Ir a {destino.label}
                </button>
              </>
            )}
          </QuickMenu>
        );
      })()}
    </Panel>
  );
}

const btn: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  borderRadius: 6,
  padding: "3px 9px",
  cursor: "pointer",
  fontSize: 12.5,
};
