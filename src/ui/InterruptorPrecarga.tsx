import React from "react";

// Interruptor del conteo de horas (el mismo en Asistencia y en la ficha del empleado). Es un BOTON:
// tocarlo enciende o apaga el calculo desde el fichero (y con el el contador de horas de la liquidacion).
export function InterruptorPrecarga({ activa, onChange }: { activa: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activa)}
      title={
        activa
          ? "ENCENDIDO: las horas del fichero se calculan solas y el total del mes de la liquidación sale del calendario. Al encenderlo se cuenta el mes. Los días con candado no se recalculan desde el fichero. Tocá para apagarlo."
          : "APAGADO: el total del mes de la liquidación se carga a mano (según los recibos). Las horas de cada día siguen a su entrada y su salida. Tocá para encenderlo."
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        border: `1px solid ${activa ? "#15803d" : "#94a3b8"}`,
        background: activa ? "#16a34a" : "#f1f5f9",
        color: activa ? "#fff" : "#334155",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ⧗ Conteo de horas: {activa ? "ENCENDIDO" : "APAGADO"}
    </button>
  );
}
