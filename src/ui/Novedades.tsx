// VENTANA DE NOVEDADES: al iniciar sesion, lo nuevo del sistema y como se usa. Ver content/novedades.ts.
import React from "react";
import type { TandaNovedades } from "../content/novedades";

export function VentanaNovedades({
  tandas,
  nombre,
  onIrA,
  onEntendido,
}: {
  tandas: TandaNovedades[];
  nombre?: string;
  onIrA?: (tab: string) => void;
  onEntendido: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "min(760px, 100%)", padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🆕 Novedades del sistema</div>
        <div style={{ fontSize: 13, color: "#475569", margin: "4px 0 14px" }}>
          {nombre ? `${nombre}, esto` : "Esto"} es lo nuevo desde la última vez, y cómo se usa.
        </div>
        {tandas.map((t) => (
          <div key={t.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", marginBottom: 6 }}>
              {t.fecha} · {t.titulo}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {t.items.map((i) => (
                <div key={i.titulo} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 14 }}>{i.titulo}</strong>
                    {i.tab && onIrA && (
                      <button
                        type="button"
                        onClick={() => onIrA(i.tab!)}
                        style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 9px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        Ir →
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", marginTop: 3 }}>{i.que}</div>
                  <div style={{ fontSize: 12.5, color: "#166534", marginTop: 4 }}>
                    <strong>Cómo se usa:</strong> {i.como}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onEntendido}
            style={{ border: "1px solid #15803d", background: "#16a34a", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: "pointer" }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
