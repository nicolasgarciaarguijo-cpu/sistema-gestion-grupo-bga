// ASISTENTE DE CIERRE DE EJERCICIO (Nicolas, 27/10/2026): "que sea automatico el cierre del año y me pida control
// para el año siguiente". Terminado el ejercicio, se le abre solo al administrador y lo lleva paso a paso:
// revisar lo que sigue abierto, controlar bancos y efectivo (el arqueo, donde se corrige lo real) y cerrar cada
// empresa. El cierre en si es el de siempre (cerrarEjercicio): arqueo, carpeta, respaldo y "CERRAR".
import React from "react";
import { ButtonLike } from "./primitives";

export type EmpresaPorCerrar = { company: string; short: string; fiscalStartYear: number; endIso: string };

const paso: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc", display: "grid", gap: 6 };
const num: React.CSSProperties = { fontWeight: 800, color: "#0f766e", marginRight: 6 };
const fecha = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const nombreEjercicio = (anio: number) => `${anio}-${String((anio + 1) % 100).padStart(2, "0")}`;

export function AsistenteCierre({
  porCerrar,
  busy,
  mensaje,
  onRevisar,
  onCerrar,
  onMasTarde,
}: {
  porCerrar: EmpresaPorCerrar[];
  busy: boolean;
  mensaje: string;
  onRevisar: () => void;
  onCerrar: (company: string, fiscalStartYear: number) => void;
  onMasTarde: () => void;
}) {
  if (!porCerrar.length) return null;
  const anio = porCerrar[0].fiscalStartYear;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 75, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "min(720px, 100%)", padding: 20, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Cierre de ejercicio</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Terminó el ejercicio {nombreEjercicio(anio)} (al {fecha(porCerrar[0].endIso)})</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
            Para arrancar el {nombreEjercicio(anio + 1)} limpio hay que cerrarlo. No se borra nada: lo del ejercicio queda para mirar
            (solo lectura) y todo lo que sigue en proceso (trabajos, cobros, deudas, cajas) pasa al año nuevo.
          </div>
        </div>

        <div style={paso}>
          <div><span style={num}>1</span><strong>Revisá lo que sigue abierto</strong></div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Cobros pendientes de los trabajos, pagos programados sin pagar, cuentas corrientes y cajas chicas abiertas, por empresa. Es lo que
            va a seguir figurando el año que viene: confirmá que está bien.
          </div>
          <div><ButtonLike secondary onClick={onRevisar}>Ver lo que sigue abierto (Balance)</ButtonLike></div>
        </div>

        <div style={paso}>
          <div><span style={num}>2</span><strong>Controlá bancos y efectivo, y cerrá cada empresa</strong></div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Al cerrar te pide la plata REAL de cada banco y del efectivo blanco y negro. Si no coincide con el sistema, corregís el número y
            decís por qué (retiro, aporte o ajuste): el año nuevo arranca con lo contado, sin diferencias. Después guarda todo en la carpeta
            vinculada y te pide escribir CERRAR.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {porCerrar.map((e) => (
              <ButtonLike key={e.company} disabled={busy} onClick={() => onCerrar(e.company, e.fiscalStartYear)}>
                Cerrar {e.short}
              </ButtonLike>
            ))}
          </div>
          {mensaje && <div style={{ fontSize: 12.5, color: "#0f766e", fontWeight: 700 }}>{mensaje}</div>}
        </div>

        <div style={{ fontSize: 12.5, color: "#64748b" }}>
          Hace falta tener vinculada la carpeta del sistema. Hasta que no se cierre, arriba queda el aviso para retomarlo.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ButtonLike secondary onClick={onMasTarde}>Más tarde</ButtonLike>
        </div>
      </div>
    </div>
  );
}
