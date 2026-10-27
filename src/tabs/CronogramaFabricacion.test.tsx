// Cronograma automatico: muestra cuando termina cada trabajo y si llega; el detalle lista quien y cuando.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { CronogramaFabricacion } from "./CronogramaFabricacion";

describe("CronogramaFabricacion", () => {
  it("dice cuándo termina y si llega a la entrega, y pasa las tareas a la organización diaria", () => {
    const pasar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const confirmar = jest.spyOn(window, "confirm").mockReturnValue(true);
    act(() =>
      root.render(
        <CronogramaFabricacion
          trabajos={[{ jobId: 7, nombre: "P-100 · Cliente", company: "De raiz s.r.l", inicio: "2026-10-26", entrega: "2026-10-26", muebles: [{ id: 1, tipoMuebleId: 1, cantidad: 1 }], materiales: [], deCotizacion: true }]}
          sinMuebles={[]}
          tipos={[{ id: 1, nombre: "Alacena", receta: [{ id: 11, tareaId: 1, paso: 1, factor: 1, base: "u" }] }]}
          tareas={[{ id: 1, nombre: "Cortar", unidad: "u", horasEstimadas: 9 }]}
          rubros={[]}
          personas={[{ id: 3, nombre: "Ana", costoHora: 1, tareas: [1] }]}
          hoy="2026-10-26"
          companyShort={() => "DR"}
          onGuardarFabricacion={() => {}}
          onPasarAOrganizacion={pasar}
          nuevoId={() => 1}
        />
      )
    );
    expect(div.textContent).toContain("26/10"); // termina el lunes
    expect(div.textContent).toContain("Justo"); // termina el día de la entrega: sin holgura
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Quién y cuándo"))!.click());
    expect(div.textContent).toContain("Ana");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Pasar a la organización"))!.click());
    expect(pasar).toHaveBeenCalledWith(7, expect.arrayContaining([expect.objectContaining({ personaId: 3, fecha: "2026-10-26", desde: "07:30", hasta: "13:30" })]));
    confirmar.mockRestore();
    act(() => root.unmount());
  });
});
