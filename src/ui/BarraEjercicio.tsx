// LA BARRA DEL EJERCICIO (un boton por ejercicio, con sus fechas).
//
// Nicolas, 04/11/2026: "que queden guardados detras de un boton que diga las fechas de su ejercicio...
// no quiero ver nada viejo". 18/11/2026: deja de ser solo del Calendario y del Balance y pasa a estar en
// TODAS las solapas de administracion, porque el ejercicio elegido ahora decide que listados se ven:
// "todo lo del ejercicio anterior no se visualice y quede guardado en el ejercicio anterior; si quiero
// verlo tengo que volver ese ejercicio".
//
// Es el unico lugar donde se cambia de ejercicio. Lo que se esconde NO se borra ni cambia ningun numero:
// ver domain/ejercicioVisible.ts.
import React from "react";

export type BarraEjercicioProps = {
  anio: number; // ejercicio elegido (ano de inicio)
  corriente: number; // el que esta en curso hoy
  cerrados: number[]; // ejercicios con cierre hecho (solo lectura)
  fechas: (anio: number) => string; // "01/11/2026 – 31/10/2027"
  onElegir: (anio: number) => void;
  // Mientras el Balance tiene el modo "todo el historial", el boton no queda marcado.
  marcado?: boolean;
};

export function BarraEjercicio({ anio, corriente, cerrados, fechas, onElegir, marcado = true }: BarraEjercicioProps) {
  const ejercicios = Array.from(new Set([corriente, corriente - 1, anio, ...cerrados])).sort((a, b) => b - a);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 10px", fontSize: 13 }}>
      {ejercicios.map((y) => {
        const elegido = y === anio && marcado;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onElegir(y)}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12.5,
              border: `1px solid ${elegido ? (y === corriente ? "#15803d" : "#b91c1c") : "#cbd5e1"}`,
              background: elegido ? (y === corriente ? "#16a34a" : "#b91c1c") : "#fff",
              color: elegido ? "#fff" : "#334155",
            }}
          >
            {y === corriente ? "En curso · " : ""}
            {fechas(y)}
            {cerrados.includes(y) ? " · cerrado" : ""}
          </button>
        );
      })}
      {anio !== corriente && (
        <span style={{ color: "#991b1b", fontWeight: 700 }}>
          Estás viendo otro ejercicio{cerrados.includes(anio) ? " (cerrado: solo lectura)" : ""}.
        </span>
      )}
    </div>
  );
}

// El aviso de lo que quedo afuera de la vista. Va al pie del listado: esconder sin decirlo seria
// indistinguible de haber borrado.
export function AvisoEscondidoPorEjercicio({
  anteriores,
  posteriores,
  desdeIso,
}: {
  anteriores: number;
  posteriores: number;
  desdeIso: string;
}) {
  if (anteriores + posteriores === 0) return null;
  const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
  const partes: string[] = [];
  if (anteriores > 0) partes.push(`${anteriores} de antes del ${dmy(desdeIso)}`);
  if (posteriores > 0) partes.push(`${posteriores} posterior(es) a este ejercicio`);
  return (
    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 8, borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>
      No se muestran {partes.join(" y ")}. Nada se borró: para verlos, elegí ese ejercicio en los botones de arriba.
    </div>
  );
}
