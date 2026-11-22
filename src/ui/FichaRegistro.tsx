import React, { useEffect } from "react";
import { EmpresaSelect } from "./EmpresaSelect";
import { problemasDeFicha } from "../domain/validaciones";

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
  // Dato que hay que completar sí o sí: vacío (o en cero, si es un número) queda en rojo y la ficha lo avisa.
  obligatorio?: boolean;
  // VALIDACION (21/11/2026, domain/validaciones.problemasDeFicha): un número negativo es un error salvo que se
  // permita; `cuit` pide los 11 dígitos; `minimo` / `maximo` acotan un número (el día del mes).
  permiteNegativo?: boolean;
  cuit?: boolean;
  minimo?: number;
  maximo?: number;
  // Un error que solo conoce la solapa (un código repetido). Si viene, el campo queda marcado con ese texto.
  error?: string;
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
  // Lo que falta o está mal. La ficha guarda cada cambio al momento, así que no hay un "Guardar" que frenar:
  // se marca el campo en rojo con el motivo, se lista arriba y el botón de salir lo dice.
  const problemas = problemasDeFicha(campos, valores);
  const problemaDe = (key: string) => problemas.find((p) => p.key === key);
  const rojo: React.CSSProperties = { borderColor: "#f87171", background: "#fef2f2" };
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
          style={{ ...input, textAlign: c.tipo === "numero" ? "right" : undefined, ...(problemaDe(c.key) ? rojo : {}) }}
          type={c.tipo === "numero" ? "number" : c.tipo === "fecha" ? "date" : "text"}
          {...(c.tipo === "fecha" ? { min: "2015-01-01", max: "2100-12-31" } : {})}
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
          <button
            type="button"
            data-cerrar-ficha
            onClick={onCerrar}
            style={{ border: `1px solid ${problemas.length ? "#f59e0b" : "#cbd5e1"}`, background: problemas.length ? "#fffbeb" : "#fff", color: problemas.length ? "#92400e" : undefined, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: problemas.length ? 700 : undefined, whiteSpace: "nowrap" }}
          >
            {problemas.length ? `Cerrar igual (${problemas.length === 1 ? "falta 1 dato" : `faltan ${problemas.length} datos`})` : "Listo"}
          </button>
        </div>
        {problemas.length > 0 && (
          <div data-problemas-ficha style={{ fontSize: 12.5, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px" }}>
            <strong>Para que esta ficha quede bien cargada:</strong> {problemas.map((p) => `${p.label} (${p.texto})`).join(" · ")}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {campos.map((c) => (
            <label key={c.key} style={{ ...etiqueta, gridColumn: c.ancho === "completo" || c.tipo === "area" ? "1 / -1" : undefined }} title={c.ayuda}>
              {c.label}
              {control(c)}
              {problemaDe(c.key) && <span data-problema={c.key} style={{ color: "#b91c1c", fontWeight: 600, fontSize: 11.5 }}>{problemaDe(c.key)!.texto}</span>}
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
