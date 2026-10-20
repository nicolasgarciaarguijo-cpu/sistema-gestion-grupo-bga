// VENTANA DEL ARQUEO DE CIERRE: por cada cuenta, lo que dice el sistema y lo que hay de verdad. Si no
// coinciden, el motivo. Ver domain/arqueoCierre.ts.
import React, { useState } from "react";
import { diferencia, faltantesDelArqueo, TOLERANCIA_ARQUEO, type FilaArqueo } from "../domain/arqueoCierre";

import NumInput from "./NumInput";
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, boxSizing: "border-box" };

export function ArqueoCierre({
  empresa,
  hastaIso,
  filasIniciales,
  money,
  onConfirmar,
  onCancelar,
}: {
  empresa: string;
  hastaIso: string;
  filasIniciales: FilaArqueo[];
  money: (n: number, currency?: string) => string;
  onConfirmar: (filas: FilaArqueo[]) => void;
  onCancelar: () => void;
}) {
  const [filas, setFilas] = useState<FilaArqueo[]>(filasIniciales);
  const set = (i: number, patch: Partial<FilaArqueo>) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const faltan = faltantesDelArqueo(filas);
  const fecha = `${hastaIso.slice(8, 10)}/${hastaIso.slice(5, 7)}/${hastaIso.slice(0, 4)}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4500, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "min(980px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>Arqueo de cierre · {empresa}</div>
        <div style={{ fontSize: 13, color: "#475569", margin: "4px 0 12px" }}>
          Cargá <strong>la plata que hay de verdad al {fecha}</strong> en cada cuenta. El ejercicio nuevo arranca con estos
          números. Si alguno no coincide con el sistema, decí por qué: un <strong>retiro de socios</strong> (falta plata) o un{" "}
          <strong>aporte</strong> (sobra) quedan asentados; una diferencia de arqueo queda explicada en el cierre.
        </div>
        {filas.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Esta empresa no tiene cuentas cargadas.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: 12 }}>
                  <th style={{ textAlign: "left", padding: 6 }}>Cuenta</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Según el sistema</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Hay de verdad</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Diferencia</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const d = diferencia(f);
                  const hay = Math.abs(d) > TOLERANCIA_ARQUEO;
                  return (
                    <tr key={f.cuentaId} style={{ borderTop: "1px solid #e2e8f0", background: hay ? "#fffbeb" : undefined }}>
                      <td style={{ padding: 6 }}>
                        <strong>{f.nombre}</strong>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {f.tipo === "banco" ? "Banco" : f.tipo === "persona" ? "Caja de persona" : "Efectivo"} · {f.color} · {f.moneda === "USD" ? "dólares" : "pesos"}
                        </div>
                      </td>
                      <td style={{ padding: 6, textAlign: "right" }}>{money(f.sistema, f.moneda)}</td>
                      <td style={{ padding: 6, textAlign: "right" }}>
                        <NumInput
                          style={{ ...input, width: 140, textAlign: "right" }}
                          value={Number.isFinite(f.real) ? f.real : ""}
                          onChange={(e) => set(i, { real: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td style={{ padding: 6, textAlign: "right", fontWeight: 800, color: !hay ? "#16a34a" : d < 0 ? "#b91c1c" : "#1d4ed8" }}>
                        {hay ? `${d > 0 ? "+" : "−"}${money(Math.abs(d), f.moneda)}` : "✓"}
                      </td>
                      <td style={{ padding: 6 }}>
                        {hay && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <select style={input} value={f.motivo || ""} onChange={(e) => set(i, { motivo: (e.target.value || undefined) as any })}>
                              <option value="">Elegí el motivo…</option>
                              {d < 0 && <option value="retiro">Retiro de socios</option>}
                              {d > 0 && <option value="aporte">Aporte de socios</option>}
                              <option value="ajuste">Diferencia de arqueo</option>
                              <option value="otro">Otro</option>
                            </select>
                            {(f.motivo === "retiro" || f.motivo === "aporte") && (
                              <input style={{ ...input, width: 150 }} value={f.socio || ""} placeholder="¿Qué socio?" onChange={(e) => set(i, { socio: e.target.value })} />
                            )}
                            {(f.motivo === "ajuste" || f.motivo === "otro") && (
                              <input style={{ ...input, width: 220 }} value={f.detalle || ""} placeholder="Explicá la diferencia" onChange={(e) => set(i, { detalle: e.target.value })} />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {faltan.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: "#b45309" }}>
            {faltan.map((x) => (
              <div key={x}>• {x}</div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onCancelar} style={{ ...input, cursor: "pointer", padding: "7px 14px" }}>
            Cancelar el cierre
          </button>
          <button
            type="button"
            disabled={faltan.length > 0}
            onClick={() => onConfirmar(filas)}
            style={{
              ...input,
              padding: "7px 14px",
              fontWeight: 800,
              border: "1px solid #15803d",
              background: faltan.length > 0 ? "#bbf7d0" : "#16a34a",
              color: "#fff",
              cursor: faltan.length > 0 ? "not-allowed" : "pointer",
            }}
          >
            Confirmar el arqueo y seguir
          </button>
        </div>
      </div>
    </div>
  );
}
