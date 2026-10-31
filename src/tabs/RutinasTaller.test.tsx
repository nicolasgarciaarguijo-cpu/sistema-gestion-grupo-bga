// Bloque "Mantenimiento, orden y limpieza": la tabla con el orden de quienes la hacen, la prevision y completar el dia.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { RutinasTaller } from "./RutinasTaller";
import type { CandidatoRutina, RutinaTaller as Rutina } from "../domain/rutinasTaller";

const gente: CandidatoRutina[] = [
  { id: 1, nombre: "Oficial", company: "De Raiz", costoHora: 9000, ayudante: false },
  { id: 2, nombre: "Aprendiz", company: "De Raiz", costoHora: 5000, ayudante: true },
];
const rutinas: Rutina[] = [{ id: 10, nombre: "Barrido del taller", frecuencia: "diaria", horas: 0.5 }];

describe("RutinasTaller", () => {
  it("muestra el orden, la previsión y completa el día", () => {
    const completar = jest.fn(() => ({ dias: [], puestas: [{ rutinaId: 10, empleado: "Aprendiz", desde: "16:30", hasta: "17:00" }], sinHueco: [], yaEstaban: 0 }));
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    act(() =>
      root.render(
        <RutinasTaller rutinas={rutinas} candidatos={gente} gruposCosto={["Limpieza"]} tareas={[]} money={(n) => `$${Math.round(n)}`} hoy="2026-11-02" onGuardar={jest.fn()} onBorrar={jest.fn()} onCompletarDia={completar} nuevoId={() => 1} />
      )
    );
    expect(div.textContent).toContain("Aprendiz → Oficial");
    expect(div.textContent).toContain("sin grupo (no llega a Marcadores)");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Completar huecos del día")!.click());
    expect(completar).toHaveBeenCalledWith("2026-11-02");
    expect(div.textContent).toContain("Barrido del taller: Aprendiz de 16:30 a 17:00");
    act(() => root.unmount());
  });
});
