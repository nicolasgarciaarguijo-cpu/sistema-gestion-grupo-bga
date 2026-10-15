// SOLAPA CAJA CHICA (Nicolas, 2026-10-14): a la vista solo el LISTADO de las cajas asignadas
// (responsable, tipo, fecha, monto, administracion, utilizado y lo que resta) y los TIPOS de caja chica.
// Click derecho sobre el responsable abre su FICHA: ahi se rinden gastos, se leen tickets y facturas, y
// se ve el historial de sus cajas y rendiciones. Los viaticos son un tipo de caja chica.
import React, { useMemo, useState } from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { porTipoDeCaja, resumenCaja, type FondoLike, type GastoLike } from "../domain/cajaChicaFicha";
import { getFundSemaphore } from "../domain/pettyCash";

export type ViaticoFila = { id: number; company: string; persona: string; fecha: string; monto: number; administration: "blanco" | "negro"; motivo: string; rendido?: boolean };

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#475569", padding: "5px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const SEMAFORO: Record<string, string> = { verde: "#16a34a", amarillo: "#f59e0b", rojo: "#dc2626" };
const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

function AdminTag({ a }: { a: string }) {
  const negro = a === "negro";
  const mixta = a === "mixta";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        padding: "1px 7px",
        borderRadius: 999,
        background: negro ? "#1f2937" : mixta ? "#e0e7ff" : a === "blanco" ? "#f1f5f9" : "#fee2e2",
        color: negro ? "#fde68a" : mixta ? "#3730a3" : a === "blanco" ? "#0f172a" : "#b91c1c",
        border: "1px solid #cbd5e1",
      }}
    >
      {negro ? "N" : a === "blanco" ? "B" : mixta ? "B + N" : "sin clasificar"}
    </span>
  );
}

export function CajaChicaListado({
  fondos,
  gastos,
  tipos,
  viaticos,
  companyShort,
  money,
  onNuevaCaja,
  onAbrirFicha,
  onEditarCaja,
  onEliminarCaja,
  onQuitarViatico,
  onAgregarTipo,
  onRenombrarTipo,
  onQuitarTipo,
}: {
  fondos: FondoLike[];
  gastos: GastoLike[];
  tipos: string[];
  viaticos: ViaticoFila[];
  companyShort: (company: string) => string;
  money: (n: number) => string;
  onNuevaCaja: () => void;
  onAbrirFicha: (responsable: string) => void;
  onEditarCaja: (fundId: number) => void;
  onEliminarCaja: (fundId: number, conGastos: boolean) => void;
  onQuitarViatico?: (id: number) => void;
  onAgregarTipo: (nombre: string) => void;
  onRenombrarTipo: (viejo: string, nuevo: string) => void;
  onQuitarTipo: (nombre: string) => void;
}) {
  const [verCerradas, setVerCerradas] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [menuTipo, setMenuTipo] = useState<null | { x: number; y: number; tipo: string }>(null);
  const [menuCaja, setMenuCaja] = useState<null | { x: number; y: number; id: number }>(null);

  const filas = useMemo(
    () =>
      fondos
        .filter((f) => verCerradas || !f.closed)
        .map((f) => ({ f, r: resumenCaja(f, gastos) }))
        .sort((a, b) => (b.f.deliveredDate || "").localeCompare(a.f.deliveredDate || "") || b.f.id - a.f.id),
    [fondos, gastos, verCerradas]
  );
  const viaticosVisibles = viaticos.filter((v) => verCerradas || !v.rendido);
  const totales = filas.reduce(
    (a, { r }) => ({ asignado: a.asignado + r.asignado, utilizado: a.utilizado + r.utilizado, resta: a.resta + r.resta }),
    { asignado: 0, utilizado: 0, resta: 0 }
  );
  const porTipo = porTipoDeCaja(fondos, gastos, tipos);

  // Eliminar una caja: si tiene gastos, pregunta si se borran tambien o quedan sin caja.
  const pedirEliminar = (f: FondoLike) => {
    const r = resumenCaja(f, gastos);
    if (r.gastos === 0) {
      if (window.confirm(`¿Eliminar la caja chica de ${f.responsible || "sin responsable"}?`)) onEliminarCaja(f.id, false);
      return;
    }
    if (!window.confirm(`¿Eliminar la caja chica de ${f.responsible || "sin responsable"}? Tiene ${r.gastos} gasto(s) rendido(s) por ${money(r.utilizado)}.`)) return;
    const conGastos = window.confirm(
      "¿Eliminar también sus gastos?\n\nAceptar = se borran los gastos (y sus facturas de Compras) y salen del cash flow.\nCancelar = los gastos quedan cargados, sin caja."
    );
    onEliminarCaja(f.id, conGastos);
  };
  const botonAccion: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer", padding: "2px 8px", fontSize: 12, fontWeight: 700 };

  const nombreResponsable = (nombre: string, extra?: React.ReactNode) => (
    <td
      style={{ ...td, fontWeight: 800, cursor: "context-menu", whiteSpace: "nowrap" }}
      title="Click derecho: abrir la ficha del responsable"
      onContextMenu={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onAbrirFicha(nombre);
      }}
    >
      👤 {nombre || "Sin responsable"}
      {extra}
    </td>
  );

  return (
    <div style={styles.column}>
      <Panel
        span="full"
        title="Cajas chicas asignadas"
        actions={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> ver cerradas
            </label>
            <ButtonLike onClick={onNuevaCaja}>+ Nueva caja chica</ButtonLike>
          </span>
        }
      >
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          Click derecho sobre el responsable para abrir su ficha: ahí se rinden los gastos (tickets y facturas) y se ve su historial. La caja no va al cash flow; sus gastos sí, como pago a cada proveedor.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Responsable</th>
                <th style={th}>Tipo</th>
                <th style={th}>Plata de → corresponde a</th>
                <th style={th}>Asignada el</th>
                <th style={{ ...th, textAlign: "right" }}>Asignado</th>
                <th style={th}>Administración</th>
                <th style={{ ...th, textAlign: "right" }}>Utilizado</th>
                <th style={{ ...th, textAlign: "right" }}>Resta</th>
                <th style={th}>Estado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && viaticosVisibles.length === 0 && (
                <tr>
                  <td style={{ ...td, color: "#94a3b8" }} colSpan={9}>No hay cajas abiertas. Tocá "+ Nueva caja chica".</td>
                </tr>
              )}
              {filas.map(({ f, r }) => {
                const sem = getFundSemaphore(r.resta, r.asignado);
                return (
                  <tr
                    key={f.id}
                    style={{ opacity: f.closed ? 0.55 : 1 }}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      setMenuCaja({ x: ev.clientX, y: ev.clientY, id: f.id });
                    }}
                  >
                    {nombreResponsable(
                      f.responsible,
                      f.description ? <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 400 }}>{f.description}</div> : null
                    )}
                    <td style={td}>{f.tipo || "General"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {f.empresaImputada && f.empresaImputada !== f.company ? (
                        <span style={{ color: "#b45309", fontWeight: 700 }} title={`La plata sale de ${f.company}; los gastos son de ${f.empresaImputada}`}>
                          {companyShort(f.company)} → {companyShort(f.empresaImputada)}
                        </span>
                      ) : (
                        companyShort(f.company)
                      )}
                    </td>
                    <td style={td}>{fecha(f.deliveredDate)}</td>
                    <td style={num}>{money(r.asignado)}</td>
                    <td style={td}>
                      <AdminTag a={r.administracion} />
                    </td>
                    <td style={num}>{money(r.utilizado)}</td>
                    <td style={{ ...num, fontWeight: 800, color: r.resta < 0 ? "#dc2626" : undefined }}>{money(r.resta)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap", fontSize: 12 }}>
                      {f.closed ? (
                        `Cerrada${f.closedDate ? " " + fecha(f.closedDate) : ""}`
                      ) : (
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <span style={{ width: 9, height: 9, borderRadius: 999, background: SEMAFORO[sem.level] || "#94a3b8" }} />
                          {sem.label}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" style={botonAccion} title="Editar la caja" onClick={() => onEditarCaja(f.id)}>
                          ✏️ Editar
                        </button>
                        <button type="button" style={{ ...botonAccion, color: "#b91c1c" }} title="Quitar la caja" onClick={() => pedirEliminar(f)}>
                          🗑
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {viaticosVisibles.map((v) => (
                <tr key={`viatico-${v.id}`}>
                  {nombreResponsable(v.persona, v.motivo ? <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 400 }}>{v.motivo}</div> : null)}
                  <td style={td}>Viáticos <span style={{ fontSize: 11, color: "#94a3b8" }}>(anticipo)</span></td>
                  <td style={td}>{companyShort(v.company)}</td>
                  <td style={td}>{fecha(v.fecha)}</td>
                  <td style={num}>{money(v.monto)}</td>
                  <td style={td}>
                    <AdminTag a={v.administration} />
                  </td>
                  <td style={num}>—</td>
                  <td style={num}>—</td>
                  <td style={{ ...td, fontSize: 12 }}>{v.rendido ? "Rendido" : "Sin rendir"}</td>
                  <td style={td}>
                    {onQuitarViatico && (
                      <button
                        type="button"
                        style={{ ...botonAccion, color: "#b91c1c" }}
                        title="Quitar el viático"
                        onClick={() => {
                          if (window.confirm(`¿Quitar el viático de ${v.persona || "sin persona"} por ${money(v.monto)}?`)) onQuitarViatico(v.id);
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...td, fontWeight: 800 }} colSpan={4}>Total {verCerradas ? "" : "(cajas abiertas)"}</td>
                  <td style={{ ...num, fontWeight: 800 }}>{money(totales.asignado)}</td>
                  <td style={td} />
                  <td style={{ ...num, fontWeight: 800 }}>{money(totales.utilizado)}</td>
                  <td style={{ ...num, fontWeight: 800 }}>{money(totales.resta)}</td>
                  <td style={td} />
                  <td style={td} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>

      <Panel span="full" title="Tipos de cajas chicas">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          Ordenan las cajas y sus gastos. Al asignar una caja se elige su tipo. Click derecho sobre un tipo para renombrarlo o quitarlo.
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>Tipo</th>
              <th style={{ ...th, textAlign: "right" }}>Cajas (abiertas)</th>
              <th style={{ ...th, textAlign: "right" }}>Asignado</th>
              <th style={{ ...th, textAlign: "right" }}>Utilizado</th>
              <th style={{ ...th, textAlign: "right" }}>Resta</th>
            </tr>
          </thead>
          <tbody>
            {porTipo.map((t) => (
              <tr
                key={t.tipo}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  setMenuTipo({ x: ev.clientX, y: ev.clientY, tipo: t.tipo });
                }}
              >
                <td style={{ ...td, fontWeight: 700 }}>{t.tipo}</td>
                <td style={num}>
                  {t.cajas} ({t.abiertas})
                </td>
                <td style={num}>{money(t.asignado)}</td>
                <td style={num}>{money(t.utilizado)}</td>
                <td style={num}>{money(t.resta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input
            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13, width: 240 }}
            placeholder="Nuevo tipo (ej. Obra, Compras menores)"
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
          />
          <ButtonLike
            onClick={() => {
              const n = nuevoTipo.trim();
              if (!n) return;
              onAgregarTipo(n);
              setNuevoTipo("");
            }}
          >
            + Agregar tipo
          </ButtonLike>
        </div>
      </Panel>

      {menuCaja && (() => {
        const f = fondos.find((x) => x.id === menuCaja.id);
        if (!f) return null;
        return (
          <QuickMenu x={menuCaja.x} y={menuCaja.y} onClose={() => setMenuCaja(null)}>
            <QuickMenuTitle>{`${f.responsible || "Sin responsable"} · ${f.tipo || "General"}`}</QuickMenuTitle>
            <button style={quickMenuItem} onClick={() => { onAbrirFicha(f.responsible); setMenuCaja(null); }}>Abrir la ficha del responsable</button>
            <button style={quickMenuItem} onClick={() => { onEditarCaja(f.id); setMenuCaja(null); }}>Editar caja…</button>
            <QuickMenuSep />
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                setMenuCaja(null);
                pedirEliminar(f);
              }}
            >
              🗑 Eliminar caja chica…
            </button>
          </QuickMenu>
        );
      })()}
      {menuTipo && (
        <QuickMenu x={menuTipo.x} y={menuTipo.y} onClose={() => setMenuTipo(null)}>
          <QuickMenuTitle>{menuTipo.tipo}</QuickMenuTitle>
          <button
            style={quickMenuItem}
            onClick={() => {
              const nuevo = window.prompt("Nuevo nombre del tipo:", menuTipo.tipo);
              if (nuevo && nuevo.trim() && nuevo.trim() !== menuTipo.tipo) onRenombrarTipo(menuTipo.tipo, nuevo.trim());
              setMenuTipo(null);
            }}
          >
            Renombrar…
          </button>
          <QuickMenuSep />
          <button
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              const t = porTipo.find((x) => x.tipo === menuTipo.tipo);
              if (t && t.cajas > 0) window.alert("Este tipo tiene cajas asignadas: cambiales el tipo antes de quitarlo.");
              else onQuitarTipo(menuTipo.tipo);
              setMenuTipo(null);
            }}
          >
            Quitar tipo
          </button>
        </QuickMenu>
      )}
    </div>
  );
}
