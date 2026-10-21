// RESUMEN DE MOVIMIENTOS (Nicolas, 2026-10-20): "tocando boton derecho sobre el monto, ver el resumen de
// movimientos hasta la fecha dentro del mes, para asegurarme que todo esta sumando bien. Ver en detalle
// cada movimiento". Lo mismo desde los valores del tablero de plata disponible, para ver la evolucion.
// Es solo para ver: cada movimiento se corrige en su solapa (el boton "Abrir" lleva ahi).
import React from "react";

export type FilaResumen = {
  fecha: string;
  detalle: string;
  origen?: string;
  empresa?: string;
  monto: number; // con signo: + entra / suma, - sale / resta
  abrir?: () => void;
  // Anterior a la APERTURA de la cuenta: ya esta dentro del saldo de apertura, no vuelve a sumar (texto = por que).
  noSuma?: string;
};

const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

export function ResumenMovimientos({
  titulo,
  subtitulo,
  saldoInicial,
  filas,
  money,
  onCerrar,
}: {
  titulo: string;
  subtitulo?: string;
  // Con saldo inicial (una cuenta) la columna de la derecha es el SALDO; sin, el acumulado del renglon.
  saldoInicial?: number;
  filas: FilaResumen[];
  money: (n: number) => string;
  onCerrar: () => void;
}) {
  const ordenadas = [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let acumulado = Number(saldoInicial || 0);
  const total = ordenadas.reduce((a, f) => (f.noSuma ? a : a + f.monto), 0);
  const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 8px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff" };
  const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "top" };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "50px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 12.5, color: "#64748b" }}>{subtitulo}</div>}
          </div>
          <button type="button" onClick={onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>
            Cerrar
          </button>
        </div>
        {ordenadas.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>No hay movimientos en el mes hasta esta fecha.</div>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Movimiento</th>
                  <th style={{ ...th, textAlign: "right" }}>Monto</th>
                  <th style={{ ...th, textAlign: "right" }}>{saldoInicial !== undefined ? "Saldo" : "Acumulado"}</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {saldoInicial !== undefined && (
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={td} colSpan={3}>Saldo al empezar el mes</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(Number(saldoInicial))}</td>
                    <td style={td}></td>
                  </tr>
                )}
                {ordenadas.map((f, i) => {
                  if (!f.noSuma) acumulado += f.monto;
                  return (
                    <tr key={i} style={f.noSuma ? { opacity: 0.55, background: "#f8fafc" } : undefined} title={f.noSuma}>
                      <td style={{ ...td, whiteSpace: "nowrap", color: "#475569" }}>{fmt(f.fecha)}</td>
                      <td style={td}>
                        {f.detalle || "—"}
                        {(f.origen || f.empresa) && (
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{[f.origen, f.empresa].filter(Boolean).join(" · ")}</div>
                        )}
                        {f.noSuma && <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>⚠ {f.noSuma}</div>}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: f.monto < 0 ? "#b91c1c" : "#166534" }}>
                        {f.monto < 0 ? "−" : "+"}{money(Math.abs(f.monto))}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", color: acumulado < 0 ? "#b91c1c" : "#0f172a" }}>{f.noSuma ? "—" : money(acumulado)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {f.abrir && (
                          <button type="button" onClick={f.abrir} title="Abrir donde se cargó" style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 5, padding: "1px 6px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                            Abrir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span>{ordenadas.length} movimiento(s)</span>
          <span>
            {saldoInicial !== undefined ? "Movimiento del mes " : "Total "}
            <strong style={{ color: total < 0 ? "#b91c1c" : "#0f172a" }}>{money(total)}</strong>
            {saldoInicial !== undefined && (
              <>
                {" · saldo "}
                <strong>{money(Number(saldoInicial) + total)}</strong>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
