// Piezas compartidas de las fichas de linkeo (tarjeta y extracto, 2026-10-31): el menu de click derecho que se
// ve POR ENCIMA de una ventana (el QuickMenu general queda debajo de los modales) y el buscador para elegir con
// que se linkea un renglon.
import React, { useEffect, useMemo, useState } from "react";

export const Z_FICHA = 4600;

export function MenuFicha({ x, y, onClose, children }: { x: number; y: number; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: Math.min(x, window.innerWidth - 280),
        top: Math.min(y, window.innerHeight - 300),
        zIndex: Z_FICHA + 50,
        background: "#fff",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        boxShadow: "0 8px 28px rgba(0,0,0,0.20)",
        padding: 6,
        minWidth: 240,
        maxHeight: "70vh",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

export function ItemMenu({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "transparent", cursor: disabled ? "default" : "pointer", fontSize: 13, borderRadius: 6, color: disabled ? "#94a3b8" : "#0f172a" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = disabled ? "transparent" : "#f1f5f9")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
export const SepMenu = () => <div style={{ borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />;
export const TituloMenu = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: "#64748b", padding: "4px 8px", fontWeight: 700 }}>{children}</div>
);

export type OpcionVinculo = { id: string; texto: string; detalle?: string; destacada?: boolean };

// Ventana chica para elegir una opcion (pago, factura, resumen, trabajo) con busqueda. Las destacadas (las
// que coinciden en monto) van primero.
export function BuscadorVinculo({ titulo, opciones, onElegir, onCerrar }: { titulo: string; opciones: OpcionVinculo[]; onElegir: (id: string) => void; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return opciones
      .filter((o) => !t || `${o.texto} ${o.detalle || ""}`.toLowerCase().includes(t))
      .sort((a, b) => Number(!!b.destacada) - Number(!!a.destacada))
      .slice(0, 80);
  }, [opciones, q]);
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: Z_FICHA + 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(620px, 100%)", padding: 14, display: "grid", gap: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ fontWeight: 800 }}>{titulo}</div>
        <input autoFocus placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }} />
        <div style={{ maxHeight: "55vh", overflowY: "auto", display: "grid", gap: 4 }}>
          {lista.length === 0 && <div style={{ fontSize: 13, color: "#64748b", padding: 8 }}>No hay opciones para linkear.</div>}
          {lista.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onElegir(o.id)}
              style={{ textAlign: "left", padding: "7px 9px", border: `1px solid ${o.destacada ? "#86efac" : "#e2e8f0"}`, background: o.destacada ? "#f0fdf4" : "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
            >
              <div style={{ fontWeight: 700 }}>{o.texto}</div>
              {o.detalle && <div style={{ fontSize: 12, color: "#64748b" }}>{o.detalle}</div>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onCerrar} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export const ddmm = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function IconoEstado({ estado }: { estado: string }) {
  const m: Record<string, [string, string, string]> = {
    linkeado: ["✓", "#166534", "Linkeado"],
    comision: ["%", "#7c3aed", "Va a Comisiones, tasas e intereses"],
    sugerido: ["?", "#b45309", "Hay una sugerencia: confirmala con click derecho"],
    pendiente: ["D", "#b91c1c", "Falta linkear"],
    desconocido: ["!", "#b91c1c", "Desconocido: reclamar al banco"],
    pago_resumen: ["·", "#64748b", "Pago del resumen anterior (se ve en el banco)"],
  };
  const [t, c, tip] = m[estado] || ["", "#64748b", ""];
  return (
    <span title={tip} style={{ display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 999, fontWeight: 800, fontSize: 12, color: "#fff", background: c }}>
      {t}
    </span>
  );
}
