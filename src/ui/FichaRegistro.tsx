import React, { useEffect } from "react";
import { EmpresaSelect } from "./EmpresaSelect";

// FICHA DE UN REGISTRO (Nicolas, 31/10/2026: "todo lo quiero armado con fichas y dentro de las fichas seleccionamos las
// empresas, ahi se hace la separacion"). Una ventana emergente con todos los datos del registro y su empresa arriba. La usan
// las solapas que solo tenian la fila de la planilla (seguros, inversiones, tarjetas, stock, movimientos internos,
// marcadores): se abre con el boton 📋 de la fila y cada cambio se guarda al momento, como en la fila.
export type CampoFicha = {
  key: string;
  label: string;
  tipo: "texto" | "numero" | "fecha" | "area" | "select" | "empresa" | "check";
  opciones?: Array<{ value: string; label: string }>;
  // Sugerencias para un texto libre (datalist).
  sugerencias?: string[];
  // Empresa: si puede ser de las dos (solo lo que no mueve plata).
  compartido?: boolean;
  ancho?: "completo";
  ayuda?: string;
  soloLectura?: boolean;
  // Select que hay que completar sí o sí (la cuenta de un movimiento de plata): vacío queda en rojo.
  obligatorio?: boolean;
  vacio?: string; // texto de la opción vacía de un select obligatorio
};

const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", background: "#fff" };
const etiqueta: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };

export function FichaRegistro({
  titulo,
  subtitulo,
  valores,
  campos,
  empresas,
  onCambiar,
  onCerrar,
  pie,
}: {
  titulo: string;
  subtitulo?: string;
  valores: Record<string, any>;
  campos: CampoFicha[];
  empresas: Array<{ value: string; short?: string; label?: string }>;
  onCambiar: (key: string, valor: any) => void;
  onCerrar: () => void;
  // Acciones propias de la solapa (adjuntar, dar de baja...).
  pie?: React.ReactNode;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);
  const control = (c: CampoFicha) => {
    const v = valores[c.key];
    if (c.tipo === "empresa")
      return <EmpresaSelect style={input} value={v} opciones={empresas} compartido={!!c.compartido} disabled={c.soloLectura} onChange={(x) => onCambiar(c.key, x)} />;
    if (c.tipo === "select")
      return (
        <select
          style={{ ...input, ...(c.obligatorio && (v == null || v === "") ? { borderColor: "#f87171", background: "#fef2f2" } : {}) }}
          value={v ?? ""}
          disabled={c.soloLectura}
          onChange={(e) => onCambiar(c.key, c.obligatorio && e.target.value === "" ? undefined : e.target.value)}
        >
          {c.obligatorio && <option value="">{c.vacio || "— Elegí —"}</option>}
          {(c.opciones || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {v != null && v !== "" && !(c.opciones || []).some((o) => o.value === v) && <option value={v}>{String(v)}</option>}
        </select>
      );
    if (c.tipo === "check")
      return <input type="checkbox" checked={!!v} disabled={c.soloLectura} onChange={(e) => onCambiar(c.key, e.target.checked)} style={{ width: 18, height: 18 }} />;
    if (c.tipo === "area")
      return <textarea style={{ ...input, minHeight: 64, fontFamily: "inherit" }} value={v ?? ""} readOnly={c.soloLectura} onChange={(e) => onCambiar(c.key, e.target.value)} />;
    const listId = c.sugerencias?.length ? `ficha-${c.key}` : undefined;
    return (
      <>
        <input
          style={{ ...input, textAlign: c.tipo === "numero" ? "right" : undefined }}
          type={c.tipo === "numero" ? "number" : c.tipo === "fecha" ? "date" : "text"}
          value={v ?? ""}
          readOnly={c.soloLectura}
          list={listId}
          onChange={(e) => onCambiar(c.key, c.tipo === "numero" ? Number(e.target.value || 0) : e.target.value)}
        />
        {listId && <datalist id={listId}>{c.sugerencias!.map((s) => <option key={s} value={s} />)}</datalist>}
      </>
    );
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(680px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{titulo || "Sin nombre"}</div>
            {subtitulo && <div style={{ fontSize: 12.5, color: "#64748b" }}>{subtitulo}</div>}
          </div>
          <button type="button" onClick={onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
            Listo
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {campos.map((c) => (
            <label key={c.key} style={{ ...etiqueta, gridColumn: c.ancho === "completo" || c.tipo === "area" ? "1 / -1" : undefined }} title={c.ayuda}>
              {c.label}
              {control(c)}
            </label>
          ))}
        </div>
        {pie && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{pie}</div>}
      </div>
    </div>
  );
}

// El boton de la fila que abre la ficha.
export function BotonFicha({ onClick, titulo = "Abrir la ficha" }: { onClick: () => void; titulo?: string }) {
  return (
    <button type="button" onClick={onClick} title={titulo} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "1px 6px", fontSize: 12, cursor: "pointer", flex: "none" }}>
      📋
    </button>
  );
}
