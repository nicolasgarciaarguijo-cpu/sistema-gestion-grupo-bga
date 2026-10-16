// RESPONSABLE / FIRMANTE de un movimiento de plata.
//
// Regla de Nicolas (2026-10-16): "cada movimiento de dinero o pago debe exigir un responsable o firmante".
// Y la aclaracion del mismo dia: "No se debe poder seleccionar un usuario diferente. El propio usuario que
// esta operando es necesariamente el responsable o firmante de esa accion que ejecuto, y queda asentado como
// ultimo responsable de realizar algun movimiento en el sistema."
//
// Por eso NO hay selector: el firmante es siempre el usuario con la sesion iniciada. App lo publica en
// UsuarioFirmanteContext y lo graba solo (firmante + firmadoEn) cada vez que se crea o se edita un
// movimiento. Aca solo estan las piezas para MOSTRARLO. Lo viejo sin firmante se sigue leyendo.
import React from "react";

export const UsuarioFirmanteContext = React.createContext<string>("");

export function useUsuarioFirmante(): string {
  return React.useContext(UsuarioFirmanteContext);
}

export const FIRMANTE_TITLE =
  "Responsable / firmante: el usuario que carga o corrige el movimiento. Queda asentado como último responsable.";

// true si el movimiento no tiene firmante (cargado antes de la regla).
export function faltaFirmante(firmante?: string | null): boolean {
  return !String(firmante || "").trim();
}

// Texto corto para un tooltip.
export function textoFirmante(firmante?: string | null, firmadoEn?: string | null): string {
  const f = String(firmante || "").trim();
  if (!f) return "Sin firmante (cargado antes de la regla)";
  const cuando = String(firmadoEn || "").trim();
  return cuando ? `Firmante: ${f} · ${cuando.slice(0, 16).replace("T", " ")}` : `Firmante: ${f}`;
}

// Campo de solo lectura para los formularios: quien firma al guardar (el usuario que opera). Si el
// movimiento ya tenia otro firmante, se avisa que al guardar pasa a ser este usuario.
export function FirmanteFijo({
  previo,
  style,
  labelStyle,
}: {
  previo?: string;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}) {
  const usuario = useUsuarioFirmante() || "usuario sin identificar";
  const antes = String(previo || "").trim();
  return (
    <div style={labelStyle ?? { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 }} title={FIRMANTE_TITLE}>
      Responsable / firmante
      <div
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 13,
          background: "#f1f5f9",
          color: "#0f172a",
          fontWeight: 700,
          ...(style || {}),
        }}
      >
        ✍ {usuario}
        {antes && antes !== usuario ? (
          <span style={{ fontWeight: 400, color: "#64748b" }}> (antes: {antes})</span>
        ) : null}
      </div>
    </div>
  );
}

// Version CELDA, para las planillas: muestra quien firmo la fila. Lo viejo sin firmante queda en ambar.
export function FirmanteCelda({ value, firmadoEn, style }: { value?: string; firmadoEn?: string; style?: React.CSSProperties }) {
  const falta = faltaFirmante(value);
  return (
    <span
      title={textoFirmante(value, firmadoEn)}
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        fontSize: 12,
        padding: "0 6px",
        borderRadius: 999,
        ...(style || {}),
        ...(falta ? { background: "#fffbeb", color: "#92400e", fontWeight: 700 } : { color: "#475569" }),
      }}
    >
      ✍ {falta ? "sin firmante" : value}
    </span>
  );
}
