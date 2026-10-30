// Checklist antes de produccion: lo que falta por rubro y el ok a mano.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ChecklistProduccionPanel } from "./ChecklistProduccion";
import { estadoChecklist } from "../domain/checklistProduccion";

describe("ChecklistProduccionPanel", () => {
  it("muestra lo que falta y da el ok a mano con una nota", () => {
    const marcar = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("llega el lunes");
    const estado = estadoChecklist(
      [{ rubro: "materiales" }, { rubro: "herrajes" }],
      [{ rubro: "herrajes", description: "Bisagra cazoleta", unit: "u", missing: 8 }],
      undefined
    );
    act(() => root.render(<ChecklistProduccionPanel trabajos={[{ jobId: 9, nombre: "3429 · MARIASU", company: "De raiz s.r.l", inicio: "2026-11-02", estado }]} companyShort={() => "DR"} onMarcar={marcar} />));
    expect(div.textContent).toContain("2/3");
    act(() => (Array.from(div.querySelectorAll("strong")).find((x) => x.textContent === "3429 · MARIASU") as HTMLElement).click());
    expect(div.textContent).toContain("Bisagra cazoleta — 8 u");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent === "Dar el ok a mano")!.click());
    expect(marcar).toHaveBeenCalledWith(9, "herrajes", true, "llega el lunes");
    prompt.mockRestore();
    act(() => root.unmount());
  });
});
