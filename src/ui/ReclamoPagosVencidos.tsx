import React, { useEffect, useState } from "react";
import { money } from "../lib/format";
import { ORIGEN_LABEL, type ItemInamovible } from "../domain/agendaInamovibles";

// RECORDATORIO DE PAGOS VENCIDOS (pedido de Nicolas, 2026-10-06; cambiado 2026-10-26): cuando llega la
// fecha de un pago programado y no se cargo, aparece al abrir el sistema. Es SOLO un recordatorio: desde
// aca no se paga ni se reprograma. Cada pago lleva a la ficha del proveedor (o a la solapa de donde sale)
// y el pago se gestiona ahi. Al cerrarlo (Cerrar o Esc) queda SIEMPRE un cartel rojo fijo abajo con cuantos
// pagos vencidos hay, para no olvidarse; tocandolo se vuelve a abrir. Desaparece solo cuando no queda ninguno.

const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const IR_A: Record<string, string> = {
  deuda: "Ir a Desendeudamiento",
  tarjeta: "Ir a Bancos y Tarjetas",
  sueldos: "Ir a Personal",
  seguro: "Ir a Seguros",
};

export function ReclamoPagosVencidos({
  items,
  companyShort,
  onAbrir,
}: {
  items: ItemInamovible[];
  companyShort: (company: string) => string;
  onAbrir: (item: ItemInamovible) => void;
}) {
  const [cerradoPorAhora, setCerradoPorAhora] = useState(false);
  useEffect(() => {
    const alApretar = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setCerradoPorAhora(true);
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, []);
  if (items.length === 0) return null;
  if (cerradoPorAhora)
    return (
      <button
        type="button"
        onClick={() => setCerradoPorAhora(false)}
        title="Ver los pagos programados vencidos"
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 4900,
          padding: "8px 14px",
          borderRadius: 10,
          border: "1px solid #fecaca",
          background: "#b91c1c",
          color: "#fff",
          fontWeight: 800,
          fontSize: 13,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          cursor: "pointer",
        }}
      >
        ⚠ {items.length} pago{items.length === 1 ? "" : "s"} vencido{items.length === 1 ? "" : "s"} sin cargar · ver
      </button>
    );
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setCerradoPorAhora(true)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "6vh 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, maxWidth: 760, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #fee2e2", background: "#fef2f2", borderRadius: "12px 12px 0 0" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>
            ⚠ {items.length} pago{items.length === 1 ? "" : "s"} programado{items.length === 1 ? "" : "s"} vencido
            {items.length === 1 ? "" : "s"} sin cargar
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 4 }}>
            Es un recordatorio: cada pago se gestiona desde la <strong>ficha del proveedor</strong> (o la solapa de donde sale).
          </div>
        </div>
        <div style={{ padding: "8px 20px 4px" }}>
          {items.map((i) => (
            <div
              key={i.clave}
              style={{ borderBottom: "1px solid #f1f5f9", padding: "12px 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
            >
              <div style={{ flex: "1 1 260px" }}>
                <div style={{ fontWeight: 700 }}>{i.titulo}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {companyShort(i.company)} · {ORIGEN_LABEL[i.origen]}
                  {i.detalle ? ` · ${i.detalle}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
                  {i.monto > 0 ? money(i.monto, i.currency) : "monto sin definir"} · vencía el {fmt(i.fechaLimite)} · {i.texto}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCerradoPorAhora(true);
                  onAbrir(i);
                }}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                {i.proveedor ? "Ir a la ficha del proveedor" : IR_A[i.origen] || "Ir al Calendario anual"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Al cerrarlo queda un cartel rojo abajo a la izquierda hasta que se carguen.</span>
          <button
            type="button"
            onClick={() => setCerradoPorAhora(true)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
