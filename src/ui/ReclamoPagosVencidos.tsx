import React, { useState } from "react";
import { money } from "../lib/format";
import { ORIGEN_LABEL, type ItemInamovible } from "../domain/agendaInamovibles";

// RECLAMO BLOQUEANTE (pedido de Nicolas, 2026-10-06): cuando llega la fecha de un pago programado y
// no se cargo, el sistema lo reclama y NO deja seguir hasta resolverlo. Cada pago exige una de dos:
//   - el COMPROBANTE (ya se pago: se sube el archivo y queda asentado), o
//   - REPROGRAMARLO (nueva fecha, que tiene que ser de hoy en adelante).
// No hay "posponer": es a proposito, para que no se olvide nada.

const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function ReclamoPagosVencidos({
  items,
  hoy,
  companyShort,
  onComprobante,
  onReprogramar,
}: {
  items: ItemInamovible[];
  hoy: string;
  companyShort: (company: string) => string;
  onComprobante: (item: ItemInamovible, file: File) => Promise<void> | void;
  onReprogramar: (item: ItemInamovible, fecha: string) => void;
}) {
  const [fechas, setFechas] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState<string>("");
  if (items.length === 0) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "6vh 16px",
        overflowY: "auto",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, maxWidth: 760, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #fee2e2", background: "#fef2f2", borderRadius: "12px 12px 0 0" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>
            ⚠ {items.length} pago{items.length === 1 ? "" : "s"} programado{items.length === 1 ? "" : "s"} vencido
            {items.length === 1 ? "" : "s"} sin cargar
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 4 }}>
            Para seguir usando el sistema, cada pago necesita su <strong>comprobante</strong> (si ya se pagó) o una{" "}
            <strong>nueva fecha</strong> (si se reprograma).
          </div>
        </div>
        <div style={{ padding: "8px 20px 16px" }}>
          {items.map((i) => {
            const fecha = fechas[i.clave] || "";
            const fechaOk = !!fecha && fecha >= hoy;
            return (
              <div key={i.clave} style={{ borderBottom: "1px solid #f1f5f9", padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{i.titulo}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {companyShort(i.company)} · {ORIGEN_LABEL[i.origen]}
                      {i.detalle ? ` · ${i.detalle}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{i.monto > 0 ? money(i.monto, i.currency) : "monto sin definir"}</div>
                    <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
                      vencía el {fmt(i.fechaLimite)} · {i.texto}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "#0f172a",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: subiendo ? "wait" : "pointer",
                    }}
                  >
                    {subiendo === i.clave ? "Subiendo…" : "Ya se pagó: subir comprobante"}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: "none" }}
                      disabled={!!subiendo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setSubiendo(i.clave);
                        try {
                          await onComprobante(i, file);
                        } finally {
                          setSubiendo("");
                        }
                      }}
                    />
                  </label>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>o</span>
                  <input
                    type="date"
                    min={hoy}
                    value={fecha}
                    onChange={(e) => setFechas((p) => ({ ...p, [i.clave]: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13 }}
                  />
                  <button
                    disabled={!fechaOk}
                    onClick={() => fechaOk && onReprogramar(i, fecha)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: fechaOk ? "#fff" : "#f1f5f9",
                      color: fechaOk ? "#0f172a" : "#94a3b8",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: fechaOk ? "pointer" : "not-allowed",
                    }}
                    title={fecha && !fechaOk ? "La nueva fecha tiene que ser de hoy en adelante" : ""}
                  >
                    Reprogramar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
