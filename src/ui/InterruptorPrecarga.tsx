import React from "react";

// Interruptor de la precarga de horas (el mismo en Asistencia y en la ficha del empleado). Es un BOTON:
// tocarlo enciende o apaga la precarga (y con ella el contador automatico de horas de la liquidacion).
export function InterruptorPrecarga({ activa, onChange }: { activa: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activa)}
      title={
        activa
          ? "ENCENDIDA: las horas se calculan solas desde la entrada y la salida, y se suman solas a la liquidación del mes. Tocá para apagarla."
          : "APAGADA: las horas y la liquidación del mes se cargan a mano (según los recibos). Tocá para encenderla."
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
      ⧗ Precarga de horas: {activa ? "ENCENDIDA" : "APAGADA"}
    </button>
  );
}
