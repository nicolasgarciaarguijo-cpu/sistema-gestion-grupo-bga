// RESUMEN DEL DIA en ventana emergente (Nicolas, 21/11/2026: "el aviso lo prefiero con las ventanas emergentes").
// Al entrar al sistema aparece UNA vez por dia una ventana flotante, arriba a la derecha, con lo que hay para
// mirar hoy: cobros por resolver, pagos que vencen, cuentas sin extracto, datos por corregir. No tapa la pantalla:
// se puede seguir trabajando con ella abierta, y "Seguir trabajando" la cierra hasta mañana. Queda un boton chico
// para volver a abrirla. Cada renglon lleva a la solapa donde se resuelve. No calcula nada: recibe los renglones.
import React, { useState } from "react";

export type RenglonResumen = {
  clave: string;
  icono: string;
  titulo: string; // "3 cobros para confirmar"
  detalle?: string; // "$ 8.030.630 · Contract Rent"
  tono: "urgente" | "aviso" | "info";
  ir?: () => void;
  irTexto?: string;
};

const COLOR = { urgente: "#b91c1c", aviso: "#b45309", info: "#1d4ed8" };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" };

const claveDelDia = (usuario: string, hoy: string) => `sistema-resumen-del-dia:${usuario}:${hoy}`;
const yaVisto = (usuario: string, hoy: string): boolean => {
  try {
    return window.localStorage.getItem(claveDelDia(usuario, hoy)) === "1";
  } catch {
    return false;
  }
};

export function ResumenDelDia({ renglones, hoy, usuario }: { renglones: RenglonResumen[]; hoy: string; usuario: string }) {
  const [abierto, setAbierto] = useState(() => !yaVisto(usuario, hoy));
  if (renglones.length === 0) return null;
  const cerrar = () => {
    try {
      window.localStorage.setItem(claveDelDia(usuario, hoy), "1");
    } catch {
      // sin almacenamiento: se cierra solo por esta vez
    }
    setAbierto(false);
  };
  const urgentes = renglones.filter((r) => r.tono === "urgente").length;
  if (!abierto)
    return (
      <button
        type="button"
        data-abrir-resumen
        onClick={() => setAbierto(true)}
        title="Resumen de hoy"
        style={{ position: "fixed", right: 16, top: 96, zIndex: 3400, border: `1px solid ${urgentes ? "#fecaca" : "#cbd5e1"}`, background: "#fff", borderRadius: 999, padding: "5px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 800, color: urgentes ? "#991b1b" : "#334155", boxShadow: "0 4px 12px rgba(15,23,42,0.15)" }}
      >
        📋 Hoy · {renglones.length}
      </button>
    );
  return (
    <div
      data-resumen-del-dia
      role="dialog"
      aria-label="Resumen de hoy"
      style={{ position: "fixed", right: 16, top: 96, zIndex: 3400, width: "min(430px, calc(100vw - 32px))", maxHeight: "55vh", overflowY: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.28)", padding: 12, fontSize: 12.5 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>📋 Resumen de hoy · {hoy.split("-").reverse().join("/")}</strong>
        <button type="button" data-cerrar-resumen style={{ ...btn, marginLeft: "auto" }} onClick={cerrar} title="La cierra hasta mañana. Queda el botón «Hoy» para volver a abrirla.">
          Seguir trabajando
        </button>
      </div>
      {renglones.map((r) => (
        <div key={r.clave} data-renglon-resumen={r.clave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 15 }}>{r.icono}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: COLOR[r.tono] }}>{r.titulo}</div>
            {r.detalle && <div style={{ color: "#475569" }}>{r.detalle}</div>}
          </div>
          {r.ir && (
            <button type="button" style={btn} onClick={r.ir}>
              {r.irTexto || "Ir"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
