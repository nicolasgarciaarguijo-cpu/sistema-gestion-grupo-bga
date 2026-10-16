// FICHA DE PAGO DE HABERES de una persona (en SU empresa). Hermana de la ficha del proveedor: por periodo,
// lo que corresponde (recibo oficial / liquidacion, acordado en negro, viatico fijo), los pagos que fueron
// al cash flow con su comprobante y firmante, y el saldo de la cuenta corriente (le debemos / a favor). Lo
// que falta pagar baja a Pagos programados. La ficha de Personal (datos, horas, liquidacion) es otra.
import React, { useRef, useState } from "react";
import type { PeriodoFicha } from "../domain/fichaHaberes";

type PagoFila = {
  id: number;
  date: string;
  amount: number;
  administration: "blanco" | "negro";
  metodo?: string;
  cuenta?: string;
  comprobante?: string;
  firmante?: string;
  notas?: string;
};

const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const mesTxt = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;
const ESTADO: Record<PeriodoFicha["estado"], { txt: string; fg: string; bg: string }> = {
  pagado: { txt: "Pagado", fg: "#166534", bg: "#dcfce7" },
  parcial: { txt: "Pago parcial", fg: "#b45309", bg: "#fef3c7" },
  pendiente: { txt: "Sin pagar", fg: "#b91c1c", bg: "#fee2e2" },
  a_favor: { txt: "Pagado de más (a favor)", fg: "#1e40af", bg: "#dbeafe" },
  sin_cargo: { txt: "Sin cargo", fg: "#64748b", bg: "#f1f5f9" },
};

export function FichaPagoHaberes({
  persona,
  empresaCorta,
  legajo,
  tipo,
  periodos,
  saldo,
  pagosDe,
  recibos,
  money,
  onNuevoPago,
  onAbrirPago,
  onCargarRecibo,
  onQuitarRecibo,
  onVerArchivo,
  onAbrirFichaPersonal,
  onCerrar,
}: {
  persona: string;
  empresaCorta: string;
  legajo: string;
  tipo: string;
  periodos: PeriodoFicha[];
  saldo: number;
  pagosDe: (periodo: string) => PagoFila[];
  // Recibo oficial cargado por periodo (nombre del archivo, neto y si se puede abrir).
  recibos: Record<string, { fileName: string; neto?: number | null; storagePath?: string } | undefined>;
  money: (n: number) => string;
  onNuevoPago: (periodo?: string) => void;
  onAbrirPago: (id: number) => void;
  onCargarRecibo: (periodo: string, file: File) => void;
  onQuitarRecibo: (periodo: string) => void;
  onVerArchivo?: (storagePath: string) => void;
  onAbrirFichaPersonal: () => void;
  onCerrar: () => void;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [reciboPara, setReciboPara] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | { x: number; y: number; periodo: string }>(null);
  const caja: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" };
  const titulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
  const boton: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 10px", fontSize: 13, cursor: "pointer", fontWeight: 700, background: "#fff" };
  const sinRecibo = periodos.filter((p) => p.pagoBlancoSinRecibo);
  const debemos = periodos.filter((p) => p.saldo > 1);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(900px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Ficha de pago de haberes</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>👤 {persona}</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              {empresaCorta} · legajo {legajo || "—"} · {tipo}
            </div>
          </div>
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" style={{ ...boton, background: "#16a34a", color: "#fff", borderColor: "#15803d" }} onClick={() => onNuevoPago()}>
              + Cargar pago
            </button>
            <button type="button" style={boton} onClick={onAbrirFichaPersonal}>Ficha de personal</button>
            <button type="button" style={boton} onClick={onCerrar}>Cerrar</button>
          </span>
        </div>
        <input
          ref={archivo}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && reciboPara) onCargarRecibo(reciboPara, file);
            setReciboPara(null);
            e.target.value = "";
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <div style={caja}>
            Cuenta corriente
            <br />
            <b style={{ fontSize: 17, color: saldo > 1 ? "#b45309" : saldo < -1 ? "#1e40af" : "#16a34a" }}>
              {saldo > 1 ? `Le debemos ${money(saldo)}` : saldo < -1 ? `A favor ${money(-saldo)}` : "Al día"}
            </b>
          </div>
          <div style={caja}>
            Períodos con saldo
            <br />
            <b style={{ fontSize: 17 }}>{debemos.length}</b>
          </div>
          {sinRecibo.length > 0 && (
            <div style={{ ...caja, background: "#fff7ed", borderColor: "#fdba74" }}>
              ⚠ Pagado en blanco sin recibo oficial
              <br />
              <b style={{ fontSize: 15, color: "#b45309" }}>{sinRecibo.map((p) => mesTxt(p.periodo)).join(", ")}</b>
            </div>
          )}
        </div>

        <div style={caja}>
          <div style={titulo}>Por período · click derecho: recibo oficial o cargar pago</div>
          {periodos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Todavía no hay liquidaciones ni pagos.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "4px 6px" }}>Período</th>
                  <th style={{ padding: "4px 6px" }}>Recibo oficial</th>
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>Corresponde B</th>
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>Corresponde N</th>
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>Pagado</th>
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>Saldo</th>
                  <th style={{ padding: "4px 6px" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => {
                  const rec = recibos[p.periodo];
                  const est = ESTADO[p.estado];
                  const pagos = pagosDe(p.periodo);
                  return (
                    <React.Fragment key={p.periodo}>
                      <tr
                        style={{ borderTop: "1px solid #e2e8f0", background: p.pagoBlancoSinRecibo ? "#fff7ed" : undefined, cursor: "context-menu" }}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenu({ x: ev.clientX, y: ev.clientY, periodo: p.periodo });
                        }}
                      >
                        <td style={{ padding: "4px 6px", fontWeight: 800 }}>{mesTxt(p.periodo)}</td>
                        <td style={{ padding: "4px 6px" }}>
                          {rec ? (
                            <span
                              style={{ color: "#166534", cursor: rec.storagePath && onVerArchivo ? "pointer" : undefined, textDecoration: rec.storagePath && onVerArchivo ? "underline" : undefined }}
                              onClick={() => rec.storagePath && onVerArchivo?.(rec.storagePath)}
                              title={rec.fileName}
                            >
                              ✓ {rec.neto ? `neto ${money(Number(rec.neto))}` : rec.fileName}
                            </span>
                          ) : (
                            <span style={{ color: p.pagoBlancoSinRecibo ? "#b45309" : "#94a3b8", fontWeight: p.pagoBlancoSinRecibo ? 700 : 400 }}>
                              {p.pagoBlancoSinRecibo ? "⚠ falta" : "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>{p.correspondeBlanco ? money(p.correspondeBlanco) : "—"}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>{p.correspondeNegro ? money(p.correspondeNegro) : "—"}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{p.pagado ? money(p.pagado) : "—"}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 800, color: p.saldo > 1 ? "#b45309" : p.saldo < -1 ? "#1e40af" : "#16a34a" }}>
                          {Math.abs(p.saldo) <= 1 ? "—" : money(p.saldo)}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "1px 7px", color: est.fg, background: est.bg }}>{est.txt}</span>
                          {p.saldo > 1 && p.fechaPrevista && <span style={{ fontSize: 11, color: "#64748b" }}> · vence {fecha(p.fechaPrevista)}</span>}
                        </td>
                      </tr>
                      {pagos.map((g) => (
                        <tr key={g.id} onClick={() => onAbrirPago(g.id)} style={{ cursor: "pointer", color: "#334155" }} title="Click: ver o editar el pago">
                          <td style={{ padding: "2px 6px 2px 22px" }} colSpan={2}>
                            ↳ pago {fecha(g.date)} · {g.metodo || "—"}{g.cuenta ? ` · ${g.cuenta}` : ""}
                            {g.notas ? <span style={{ color: "#64748b" }}> · {g.notas}</span> : null}
                          </td>
                          <td style={{ padding: "2px 6px", textAlign: "center" }} colSpan={2}>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "0 6px", borderRadius: 999, background: g.administration === "negro" ? "#1f2937" : "#f1f5f9", color: g.administration === "negro" ? "#fde68a" : "#0f172a" }}>
                              {g.administration === "negro" ? "N" : "B"}
                            </span>
                          </td>
                          <td style={{ padding: "2px 6px", textAlign: "right" }}>{money(g.amount)}</td>
                          <td style={{ padding: "2px 6px", fontSize: 11.5, color: g.comprobante ? "#166534" : "#b45309" }} colSpan={2}>
                            {g.comprobante ? `📎 ${g.comprobante}` : "sin comprobante"}
                            {g.firmante ? <span style={{ color: "#64748b" }}> · ✍ {g.firmante}</span> : null}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Corresponde = recibo oficial (si está cargado) o la liquidación en blanco, el acordado en negro y el viático fijo. Solo los
          pagos van al cash flow. Lo que falta pagar aparece en Pagos programados el 4.º día hábil del mes siguiente.
        </div>
      </div>
      {menu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4100 }} onClick={(e) => { e.stopPropagation(); setMenu(null); }} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: menu.x, top: menu.y, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 4, minWidth: 240 }}>
            <div style={{ fontSize: 11, color: "#64748b", padding: "4px 8px", fontWeight: 700 }}>{mesTxt(menu.periodo)}</div>
            {[
              { label: "💵 Cargar pago de este período", run: () => onNuevoPago(menu.periodo) },
              { label: recibos[menu.periodo] ? "📄 Reemplazar recibo oficial (PDF)…" : "📄 Cargar recibo oficial (PDF)…", run: () => { setReciboPara(menu.periodo); archivo.current?.click(); } },
              ...(recibos[menu.periodo]
                ? [{ label: "🗑 Quitar el recibo oficial", run: () => window.confirm("¿Quitar el recibo oficial de este período?") && onQuitarRecibo(menu.periodo) }]
                : []),
            ].map((o) => (
              <button key={o.label} type="button" style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, borderRadius: 6 }}
                onClick={() => { setMenu(null); o.run(); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
