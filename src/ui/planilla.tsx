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
// width 100% para que la planilla llegue hasta el borde de la pantalla (pedido del usuario
// 2026-08-21: "que ocupe toda la pantalla bien"). Con tableLayout fixed, el sobrante se lo lleva la
// columna que NO tiene ancho declarado -por eso la ultima usa `colFlexible`-, asi las demas conservan
// el ancho que puso el usuario y el boton Compacto sigue teniendo efecto. Si las columnas ya suman
// mas que la pantalla, la tabla desborda y scrollea como antes.
export const planillaTable: React.CSSProperties = {
  borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap", tableLayout: "fixed", width: "100%",
};
export const colLabel: React.CSSProperties = { width: "var(--pl-label-w, 230px)" };
export const colDato: React.CSSProperties = { width: "var(--pl-col-w, 110px)" };
// La ultima columna: se queda con el espacio que sobra hasta el borde.
export const colFlexible: React.CSSProperties = { width: "auto", minWidth: "var(--pl-col-w, 110px)" };

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
// background "inherit": la primera columna es sticky y necesita un fondo opaco, pero tiene que
// tomar el de SU fila -la franja, o el color de estado que la planilla le haya puesto- y no
// imponer blanco. El fondo opaco lo garantiza la regla `.planilla tbody tr` de styles.css.
export const tdNombre: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "inherit", padding: "5px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, ...anchoLabel,
};
export const tdDato: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", ...anchoDato,
};
// Para las celdas de la ultima columna (la que absorbe el sobrante): sin ancho fijo.
export const tdFlexible: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", overflow: "hidden", textOverflow: "ellipsis",
};
export const thFlexible: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 4, background: "#f8fafc", color: "#64748b",
  padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "left",
  boxShadow: "inset 0 -1px 0 #e2e8f0",
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

// Input que vive DENTRO de una celda de planilla: sin bordes ni fondo propio, ocupa
// toda la celda y solo se marca cuando esta enfocado. Sirve para las planillas donde
// se escribe directo (materiales, insumos), sin perder la estetica de planilla.
export const inputCelda: React.CSSProperties = {
  width: "100%",
  // Pedido de Nicolas (2026-08-28): "que se marquen bien las columnas, sobre todo las que tienen
  // edicion". Antes el input era invisible hasta que lo enfocabas, asi que no habia forma de saber
  // que celdas se podian tocar. Ahora TODA celda editable se ve como un campo: recuadro suave y
  // fondo blanco, que ademas se despega de las franjas grises de las filas pares.
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  background: "#ffffff",
  padding: "1px 4px",
  font: "inherit",
  color: "inherit",
  outline: "none",
  transition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
};

export const inputCeldaDerecha: React.CSSProperties = { ...inputCelda, textAlign: "right" };

// Handlers para que el input se ilumine al enfocarlo, igual que la celda marcada.
export const focoCelda = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#2563eb";
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37, 99, 235, 0.15)";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#cbd5e1";
    e.currentTarget.style.boxShadow = "none";
  },
};
