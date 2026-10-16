// FICHA DE CAJA CHICA DE UN RESPONSABLE (Nicolas, 2026-10-14). Se abre con click derecho sobre el
// responsable en la solapa Caja chica. Adentro esta todo lo de esa persona:
//   - sus cajas (historial: abiertas y cerradas) con lo asignado, lo usado y lo que resta;
//   - rendir un gasto o LEER un ticket / factura (el lector esta solo aca);
//   - sus rendiciones: cada gasto con su proveedor, su grupo de costo y si tiene factura (va a Compras y
//     a la ficha del proveedor; el pago sale de la caja chica y va al cash flow como pago al proveedor);
//   - en que se gasto (por grupo de costo y por tipo de caja), sus viaticos y lo que la empresa le debe.
import React, { useMemo, useRef, useState } from "react";
import { QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "./primitives";
import { gastosPorGrupo, resumenCaja, type FondoLike, type GastoLike } from "../domain/cajaChicaFicha";
import { textoFirmante } from "./FirmanteSelect";
import { DesbalanceCaja } from "./DesbalanceCaja";
import { getFundSemaphore } from "../domain/pettyCash";

export type GastoFicha = GastoLike & { company: string; invoiceNumber?: string; attachmentName?: string; notes?: string; firmante?: string };
type ViaticoFicha = { id: number; company: string; fecha: string; monto: number; administration: "blanco" | "negro"; motivo: string; rendido?: boolean };
type DeudaFicha = { id: number; supplier: string; invoiceNumber: string; invoiceDate: string; total: number };

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#475569", padding: "5px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const bloque: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#fff" };
const tituloBloque: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" };
const boton: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 7, padding: "6px 12px", fontSize: 13, cursor: "pointer", background: "#fff", fontWeight: 700 };
const stat: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", background: "#f8fafc", fontSize: 12 };
const SEMAFORO: Record<string, string> = { verde: "#16a34a", amarillo: "#f59e0b", rojo: "#dc2626" };
const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

export function FichaCajaChica({
  responsable,
  fondos,
  gastos,
  viaticos,
  deudas,
  companyShort,
  money,
  facturaDeGasto,
  ocrBusy,
  ocrMsg,
  onCerrar,
  onNuevaCaja,
  onEditarCaja,
  onCerrarCaja,
  onReabrirCaja,
  onQuitarCaja,
  onRendirGasto,
  onLeerTicket,
  onAbrirGasto,
  onQuitarGasto,
  onAdjuntar,
  onViaticoRendido,
}: {
  responsable: string;
  fondos: FondoLike[];
  gastos: GastoFicha[];
  viaticos: ViaticoFicha[];
  deudas: DeudaFicha[];
  companyShort: (company: string) => string;
  money: (n: number) => string;
  facturaDeGasto: (expenseId: number) => string | null;
  ocrBusy: boolean;
  ocrMsg: string;
  onCerrar: () => void;
  onNuevaCaja: () => void;
  onEditarCaja: (fundId: number) => void;
  onCerrarCaja: (fundId: number) => void;
  onReabrirCaja: (fundId: number) => void;
  onQuitarCaja: (fundId: number, conGastos: boolean) => void;
  onRendirGasto: (fundId: number | null) => void;
  onLeerTicket: (fundId: number | null, file: File) => void;
  onAbrirGasto: (expenseId: number) => void;
  onQuitarGasto: (expenseId: number) => void;
  onAdjuntar: (expenseId: number, file: File) => void;
  onViaticoRendido: (id: number, rendido: boolean) => void;
}) {
  const [menuCaja, setMenuCaja] = useState<null | { x: number; y: number; id: number }>(null);
  const [menuGasto, setMenuGasto] = useState<null | { x: number; y: number; id: number }>(null);
  const [filtroCaja, setFiltroCaja] = useState<number | "todas">("todas");
  const archivoTicket = useRef<HTMLInputElement>(null);
  const archivoAdjunto = useRef<HTMLInputElement>(null);
  const [adjuntarA, setAdjuntarA] = useState<number | null>(null);

  const cajas = useMemo(
    () =>
      [...fondos]
        .sort((a, b) => Number(a.closed) - Number(b.closed) || (b.deliveredDate || "").localeCompare(a.deliveredDate || ""))
        .map((f) => ({ f, r: resumenCaja(f, gastos) })),
    [fondos, gastos]
  );
  const abierta = cajas.find(({ f }) => !f.closed)?.f;
  const cajaParaCargar = filtroCaja !== "todas" ? filtroCaja : abierta?.id ?? null;
  const totales = cajas.reduce(
    (a, { f, r }) => ({
      asignado: a.asignado + r.asignado,
      utilizado: a.utilizado + r.utilizado,
      restaAbiertas: a.restaAbiertas + (f.closed ? 0 : r.resta),
      sobregiro: a.sobregiro + (r.resta < 0 ? -r.resta : 0),
      negroFacturado: a.negroFacturado + (r.desbalanceConocido ? r.negroFacturado : 0),
      blancoSinFactura: a.blancoSinFactura + (r.desbalanceConocido ? r.blancoSinFactura : 0),
    }),
    { asignado: 0, utilizado: 0, restaAbiertas: 0, sobregiro: 0, negroFacturado: 0, blancoSinFactura: 0 }
  );
  const gastosVisibles = gastos
    .filter((g) => filtroCaja === "todas" || g.fundId === filtroCaja)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
  const porGrupo = gastosPorGrupo(gastosVisibles);
  const nombreCaja = (id: number | null) => {
    const f = fondos.find((x) => x.id === id);
    return f ? `${f.tipo || "General"} · ${fecha(f.deliveredDate)}` : "Sin caja";
  };
  const deudaTotal = deudas.reduce((a, d) => a + Number(d.total || 0), 0);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4500, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#f8fafc", borderRadius: 12, width: "min(1180px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Ficha de caja chica</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>👤 {responsable || "Sin responsable"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ ...boton, background: "#0f766e", color: "#fff", borderColor: "#0f766e" }} onClick={() => onRendirGasto(cajaParaCargar)}>
              + Rendir gasto
            </button>
            <button type="button" style={boton} disabled={ocrBusy} onClick={() => archivoTicket.current?.click()}>
              {ocrBusy ? "Leyendo…" : "📷 Leer ticket o factura"}
            </button>
            <button type="button" style={boton} onClick={onNuevaCaja}>+ Nueva caja</button>
            <button type="button" style={boton} onClick={onCerrar}>Cerrar</button>
          </div>
          <input
            ref={archivoTicket}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onLeerTicket(cajaParaCargar, file);
              e.target.value = "";
            }}
          />
          <input
            ref={archivoAdjunto}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && adjuntarA != null) onAdjuntar(adjuntarA, file);
              setAdjuntarA(null);
              e.target.value = "";
            }}
          />
        </div>
        {ocrMsg && <div style={{ fontSize: 12.5, color: "#475569" }}>{ocrMsg}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <div style={stat}>Cajas (abiertas)<br /><b style={{ fontSize: 16 }}>{cajas.length} ({cajas.filter(({ f }) => !f.closed).length})</b></div>
          <div style={stat}>Asignado histórico<br /><b style={{ fontSize: 16 }}>{money(totales.asignado)}</b></div>
          <div style={stat}>Rendido histórico<br /><b style={{ fontSize: 16 }}>{money(totales.utilizado)}</b></div>
          <div style={stat}>Resta en cajas abiertas<br /><b style={{ fontSize: 16 }}>{money(totales.restaAbiertas)}</b></div>
          {totales.negroFacturado > 0.5 && (
            <div style={{ ...stat, background: "#fffbeb", borderColor: "#fde68a" }} title="Compras con factura pagadas con plata negra de sus cajas">
              Negro gastado con factura (N→B)<br />
              <b style={{ fontSize: 16, color: "#b45309" }}>{money(totales.negroFacturado)}</b>
            </div>
          )}
          {totales.blancoSinFactura > 0.5 && (
            <div style={{ ...stat, background: "#f5f3ff", borderColor: "#ddd6fe" }} title="Gastos sin factura pagados con plata blanca de sus cajas">
              Blanco gastado sin factura (B→N)<br />
              <b style={{ fontSize: 16, color: "#7c3aed" }}>{money(totales.blancoSinFactura)}</b>
            </div>
          )}
          {(totales.sobregiro > 0 || deudaTotal > 0) && (
            <div style={{ ...stat, background: "#fff7ed", borderColor: "#fed7aa" }}>
              La empresa le debe<br />
              <b style={{ fontSize: 16, color: "#b45309" }}>{money(totales.sobregiro + deudaTotal)}</b>
            </div>
          )}
        </div>

        <div style={bloque}>
          <div style={tituloBloque}>
            <span>Sus cajas chicas · historial</span>
            <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "none", fontWeight: 500 }}>Click derecho: editar, cerrar, reabrir o quitar · click: ver solo sus gastos</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Tipo</th>
                  <th style={th}>Plata de → corresponde a</th>
                  <th style={th}>Asignada</th>
                  <th style={{ ...th, textAlign: "right" }}>Blanco</th>
                  <th style={{ ...th, textAlign: "right" }}>Negro</th>
                  <th style={{ ...th, textAlign: "right" }}>Utilizado</th>
                  <th style={{ ...th, textAlign: "right" }}>Resta</th>
                  <th style={{ ...th, textAlign: "right" }}>Desbalance B/N</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cajas.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: "#94a3b8" }} colSpan={9}>No tiene cajas asignadas.</td>
                  </tr>
                )}
                {cajas.map(({ f, r }) => {
                  const sem = getFundSemaphore(r.resta, r.asignado);
                  const marcada = filtroCaja === f.id;
                  return (
                    <tr
                      key={f.id}
                      title={textoFirmante((f as any).firmante)}
                      onClick={() => setFiltroCaja(marcada ? "todas" : f.id)}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        setMenuCaja({ x: ev.clientX, y: ev.clientY, id: f.id });
                      }}
                      style={{ cursor: "pointer", background: marcada ? "#ecfeff" : undefined, opacity: f.closed ? 0.6 : 1 }}
                    >
                      <td style={{ ...td, fontWeight: 700 }}>
                        {f.tipo || "General"}
                        {f.description ? <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 400 }}>{f.description}</div> : null}
                      </td>
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
                      <td style={num}>{money(r.asignadoBlanco)}</td>
                      <td style={{ ...num, color: "#92400e" }}>{money(r.asignadoNegro)}</td>
                      <td style={num}>{money(r.utilizado)}</td>
                      <td style={{ ...num, fontWeight: 800, color: r.resta < 0 ? "#dc2626" : undefined }}>{money(r.resta)}</td>
                      <td style={num}>
                        <DesbalanceCaja r={r} money={money} />
                      </td>
                      <td style={{ ...td, fontSize: 12, whiteSpace: "nowrap" }}>
                        {f.closed ? (
                          `Cerrada ${fecha(f.closedDate)}`
                        ) : (
                          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <span style={{ width: 9, height: 9, borderRadius: 999, background: SEMAFORO[sem.level] || "#94a3b8" }} />
                            {sem.label}
                          </span>
                        )}
                        {r.sinClasificar > 0.5 && <div style={{ color: "#b91c1c", fontWeight: 700 }}>⚠ {money(r.sinClasificar)} sin blanco/negro</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={bloque}>
          <div style={tituloBloque}>
            <span>
              Rendiciones {filtroCaja !== "todas" ? `· ${nombreCaja(filtroCaja)}` : "· todas sus cajas"}
            </span>
            <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "none", fontWeight: 500 }}>Click derecho sobre un gasto: abrir, adjuntar comprobante o quitar</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Proveedor</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Grupo de costo</th>
                  <th style={th}>Caja</th>
                  <th style={th}>Comprobante</th>
                  <th style={{ ...th, textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastosVisibles.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: "#94a3b8" }} colSpan={7}>Sin gastos rendidos.</td>
                  </tr>
                )}
                {gastosVisibles.map((g) => {
                  const fac = facturaDeGasto(g.id);
                  return (
                    <tr
                      key={g.id}
                      title={textoFirmante(g.firmante)}
                      onDoubleClick={() => onAbrirGasto(g.id)}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        setMenuGasto({ x: ev.clientX, y: ev.clientY, id: g.id });
                      }}
                    >
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fecha(g.date)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{g.supplier || "—"}</td>
                      <td style={td}>{g.description || ""}</td>
                      <td style={{ ...td, fontSize: 12 }}>
                        {g.costGroup ? `${g.costGroupKind === "fijo" ? "Fijo" : "Variable"} · ${g.costGroup}` : <span style={{ color: "#b45309" }}>Sin grupo</span>}
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{nombreCaja(g.fundId)}</td>
                      <td style={{ ...td, fontSize: 12 }}>
                        {fac ? <span style={{ color: "#166534", fontWeight: 700 }}>🧾 {fac}</span> : g.invoiceNumber ? g.invoiceNumber : <span style={{ color: "#94a3b8" }}>sin comprobante</span>}
                        {g.attachmentName ? <div style={{ color: "#64748b" }}>📎 {g.attachmentName}</div> : null}
                      </td>
                      <td style={{ ...num, fontWeight: 700 }}>
                        {money(g.amount)}{" "}
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: "0 5px",
                            borderRadius: 999,
                            background: g.administration === "negro" ? "#1f2937" : "#f1f5f9",
                            color: g.administration === "negro" ? "#fde68a" : "#0f172a",
                          }}
                        >
                          {g.administration === "negro" ? "N" : "B"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          <div style={bloque}>
            <div style={tituloBloque}>
              <span>En qué se gastó (grupos de costo)</span>
            </div>
            {porGrupo.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Sin gastos.</div>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={th}>Grupo</th>
                    <th style={{ ...th, textAlign: "right" }}>Blanco</th>
                    <th style={{ ...th, textAlign: "right" }}>Negro</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porGrupo.map((g) => (
                    <tr key={g.grupo}>
                      <td style={td}>{g.grupo} <span style={{ color: "#94a3b8", fontSize: 11 }}>({g.cantidad})</span></td>
                      <td style={num}>{money(g.blanco)}</td>
                      <td style={{ ...num, color: "#92400e" }}>{money(g.negro)}</td>
                      <td style={{ ...num, fontWeight: 800 }}>{money(g.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={bloque}>
            <div style={tituloBloque}>
              <span>Viáticos (anticipos anteriores)</span>
            </div>
            {viaticos.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Sin viáticos sueltos. Los nuevos se asignan como caja chica de tipo "Viáticos".</div>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {viaticos.map((v) => (
                    <tr key={v.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fecha(v.fecha)}</td>
                      <td style={td}>{v.motivo || "Viático"}</td>
                      <td style={num}>
                        {money(v.monto)} {v.administration === "negro" ? "N" : "B"}
                      </td>
                      <td style={td}>
                        <label style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12 }}>
                          <input type="checkbox" checked={!!v.rendido} onChange={(e) => onViaticoRendido(v.id, e.target.checked)} /> rendido
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={bloque}>
            <div style={tituloBloque}>
              <span>Facturas que pagó de su bolsillo</span>
            </div>
            {deudas.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Nada pendiente de reintegrar.</div>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {deudas.map((d) => (
                    <tr key={d.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fecha(d.invoiceDate)}</td>
                      <td style={td}>{d.supplier} {d.invoiceNumber}</td>
                      <td style={{ ...num, color: "#b45309", fontWeight: 700 }}>{money(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {menuCaja && (
          <QuickMenu x={menuCaja.x} y={menuCaja.y} onClose={() => setMenuCaja(null)}>
            <QuickMenuTitle>{nombreCaja(menuCaja.id)}</QuickMenuTitle>
            <button style={quickMenuItem} onClick={() => { onRendirGasto(menuCaja.id); setMenuCaja(null); }}>+ Rendir gasto en esta caja</button>
            <button style={quickMenuItem} onClick={() => { onEditarCaja(menuCaja.id); setMenuCaja(null); }}>Editar caja…</button>
            {fondos.find((f) => f.id === menuCaja.id)?.closed ? (
              <button style={quickMenuItem} onClick={() => { onReabrirCaja(menuCaja.id); setMenuCaja(null); }}>Reabrir caja</button>
            ) : (
              <button
                style={quickMenuItem}
                onClick={() => {
                  if (window.confirm("¿Cerrar esta caja? Lo que sobre vuelve a la cuenta elegida.")) onCerrarCaja(menuCaja.id);
                  setMenuCaja(null);
                }}
              >
                Cerrar caja (rendida)
              </button>
            )}
            <QuickMenuSep />
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                const r = cajas.find((x) => x.f.id === menuCaja.id)?.r;
                if (!window.confirm(`¿Eliminar esta caja chica?${r && r.gastos ? ` Tiene ${r.gastos} gasto(s) por ${money(r.utilizado)}.` : ""}`)) {
                  setMenuCaja(null);
                  return;
                }
                const conGastos =
                  !!r && r.gastos > 0 &&
                  window.confirm("¿Eliminar también sus gastos?\n\nAceptar = se borran los gastos (y sus facturas de Compras) y salen del cash flow.\nCancelar = los gastos quedan cargados, sin caja.");
                onQuitarCaja(menuCaja.id, conGastos);
                setMenuCaja(null);
              }}
            >
              🗑 Eliminar caja chica…
            </button>
          </QuickMenu>
        )}
        {menuGasto && (
          <QuickMenu x={menuGasto.x} y={menuGasto.y} onClose={() => setMenuGasto(null)}>
            <QuickMenuTitle>Gasto</QuickMenuTitle>
            <button style={quickMenuItem} onClick={() => { onAbrirGasto(menuGasto.id); setMenuGasto(null); }}>Abrir / editar…</button>
            <button
              style={quickMenuItem}
              onClick={() => {
                setAdjuntarA(menuGasto.id);
                setMenuGasto(null);
                setTimeout(() => archivoAdjunto.current?.click(), 0);
              }}
            >
              📎 Adjuntar comprobante…
            </button>
            <QuickMenuSep />
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                if (window.confirm("¿Quitar este gasto? Si tenía factura, se quita también de Compras.")) onQuitarGasto(menuGasto.id);
                setMenuGasto(null);
              }}
            >
              Quitar gasto
            </button>
          </QuickMenu>
        )}
      </div>
    </div>
  );
}
