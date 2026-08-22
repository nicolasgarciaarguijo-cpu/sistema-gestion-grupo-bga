import React, { useEffect, useState } from "react";

// LA ESTETICA DE PLANILLA DEL SISTEMA (regla del usuario, 2026-08-21).
//
// "La estetica que tiene el calendario anual, simil planilla pero con esa estetica nuestra... es la
// estetica que le quiero dar a TODOS los calendarios que existan en el sistema y a todos los formatos
// de planillas. Me gusta la simpleza en la edicion tambien con el boton derecho para cargar."
//
// O sea: una planilla con los DIAS en columnas donde corresponda, y donde no, la misma planilla con
// las columnas que hagan falta. Lo que se comparte es siempre lo mismo:
//   - la primera columna (el NOMBRE) pegada a la izquierda y el encabezado inmovilizado al bajar;
//   - ancho por columna, arrastrable desde una manija VISIBLE, doble click vuelve al original;
//   - un boton "Compacto" que achica todo de una;
//   - lo que no entra se corta con "..." y se lee completo con el tooltip;
//   - editar con el BOTON DERECHO (ver QuickMenu en ui/primitives): la pill solo marca.
//
// Este modulo trae esas piezas para no copiarlas y pegarlas en cada solapa. El ancho es preferencia
// de VISTA: se guarda en el navegador, no en el estado del sistema.

export type PlanillaOpts = {
  label?: number; // ancho de la columna del nombre
  col?: number; // ancho de las demas columnas
  labelMin?: number;
  colMin?: number;
  labelCompact?: number;
  colCompact?: number;
};

const DEF: Required<PlanillaOpts> = {
  label: 230, col: 110, labelMin: 60, colMin: 22, labelCompact: 130, colCompact: 80,
};

const leer = (clave: string, porDefecto: number) => {
  if (typeof window === "undefined") return porDefecto;
  const n = Number(window.localStorage.getItem(clave));
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
};

// Ancho de las columnas de una planilla, con arrastre, doble click y modo compacto.
// `clave` identifica la planilla en el navegador (ej. "tarjetas.consumos").
export function usePlanillaWidths(clave: string, opts: PlanillaOpts = {}) {
  const o = { ...DEF, ...opts };
  const [labelW, setLabelW] = useState(() => leer(`${clave}.labelW`, o.label));
  const [colW, setColW] = useState(() => leer(`${clave}.colW`, o.col));

  useEffect(() => { window.localStorage.setItem(`${clave}.labelW`, String(labelW)); }, [clave, labelW]);
  useEffect(() => { window.localStorage.setItem(`${clave}.colW`, String(colW)); }, [clave, colW]);

  const esCompacto = labelW <= o.labelCompact && colW <= o.colCompact;
  const toggleCompacto = () => {
    setLabelW(esCompacto ? o.label : o.labelCompact);
    setColW(esCompacto ? o.col : o.colCompact);
  };

  // Arrastrar el borde del encabezado, como en una planilla.
  const startResize = (ev: React.MouseEvent, cual: "label" | "col") => {
    ev.preventDefault();
    ev.stopPropagation();
    const x0 = ev.clientX;
    const w0 = cual === "label" ? labelW : colW;
    const min = cual === "label" ? o.labelMin : o.colMin;
    const max = cual === "label" ? 700 : 400;
    const mover = (m: MouseEvent) => {
      const next = Math.min(max, Math.max(min, w0 + (m.clientX - x0)));
      if (cual === "label") setLabelW(next); else setColW(next);
    };
    const soltar = () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return {
    labelW, colW, esCompacto, toggleCompacto, startResize,
    resetLabel: () => setLabelW(o.label),
    resetCol: () => setColW(o.col),
    // Se ponen en el contenedor: las celdas toman el ancho de aca.
    vars: { ["--pl-label-w" as any]: `${labelW}px`, ["--pl-col-w" as any]: `${colW}px` } as React.CSSProperties,
  };
}

// ---- Estilos ---------------------------------------------------------------------------------
// El contenedor scrollea; el encabezado y la primera columna quedan fijos.
export const planillaWrap: React.CSSProperties = {
  overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: "72vh",
};
// tableLayout fixed + colgroup: sin esto el ancho lo decide el texto mas largo y una descripcion
// larga se come media pantalla.
export const planillaTable: React.CSSProperties = {
  borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap", tableLayout: "fixed",
};
export const colLabel: React.CSSProperties = { width: "var(--pl-label-w, 230px)" };
export const colDato: React.CSSProperties = { width: "var(--pl-col-w, 110px)" };

const anchoLabel = {
  width: "var(--pl-label-w, 230px)", minWidth: "var(--pl-label-w, 230px)",
  maxWidth: "var(--pl-label-w, 230px)", overflow: "hidden", textOverflow: "ellipsis",
} as const;
const anchoDato = {
  width: "var(--pl-col-w, 110px)", minWidth: "var(--pl-col-w, 110px)",
  maxWidth: "var(--pl-col-w, 110px)", overflow: "hidden", textOverflow: "ellipsis",
} as const;

export const thEsquina: React.CSSProperties = {
  position: "sticky", left: 0, top: 0, zIndex: 6, background: "#f1f5f9", textAlign: "left",
  padding: "6px 10px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, ...anchoLabel,
};
export const thColumna: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 4, background: "#f8fafc", color: "#64748b",
  padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "left",
  boxShadow: "inset 0 -1px 0 #e2e8f0", ...anchoDato,
};
export const tdNombre: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "#ffffff", padding: "5px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, ...anchoLabel,
};
export const tdDato: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", ...anchoDato,
};
// La manija SE VE: si es invisible, nadie se entera de que se puede arrastrar.
export const manija: React.CSSProperties = {
  position: "absolute", top: 0, right: 0, width: 7, height: "100%", cursor: "col-resize",
  userSelect: "none", background: "transparent", borderRight: "2px solid #94a3b8",
};

// Manija de arrastre para el borde de una columna del encabezado.
export function PlanillaManija({
  onMouseDown,
  onDoubleClick,
}: {
  onMouseDown: (ev: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  return (
    <span
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title="Arrastrá para achicar o agrandar la columna · doble click vuelve al ancho original"
      style={manija}
    />
  );
}

// MARCA de la celda sobre la que se abrio el menu. Pedido del usuario (2026-08-21): "me gustaria
// sumarle animacion, para dar a entender que se esta presionando sobre el numero o texto deseado".
// Sin keyframes: el borde y el fondo entran con transition, asi que se ve como un pulso suave y no
// hay que tocar hojas de estilo globales.
export const celdaMarcable: React.CSSProperties = {
  transition: "background-color 140ms ease, box-shadow 140ms ease",
};
export const celdaMarcada: React.CSSProperties = {
  ...celdaMarcable,
  background: "#eff6ff",
  boxShadow: "inset 0 0 0 2px #2563eb",
};

// Guarda cual fue la ultima celda tocada con el boton derecho. `marcar(clave)` al abrir el menu y
// `marcar(null)` al cerrarlo; `esta(clave)` dice si hay que pintarla.
export function useCeldaMarcada() {
  const [clave, setClave] = React.useState<string | null>(null);
  return {
    marcar: setClave,
    esta: (k: string) => clave === k,
    estilo: (k: string): React.CSSProperties => (clave === k ? celdaMarcada : celdaMarcable),
  };
}
