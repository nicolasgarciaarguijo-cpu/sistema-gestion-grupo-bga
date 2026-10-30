// Organizacion diaria: la gente al lado del calendario, la ficha del dia en ventana emergente y el atajo a Personal.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { OrganizacionDiaria } from "./OrganizacionDiaria";

describe("OrganizacionDiaria", () => {
  it("abre la ficha del día en ventana emergente y lleva a la ficha de Personal", () => {
    const aPersonal = jest.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const noop = () => {};
    act(() =>
      root.render(
        <OrganizacionDiaria
          empleados={[{ id: 3, name: "Ana Pérez", company: "De raiz s.r.l" }]}
          trabajos={[]}
          asignaciones={[]}
          grupos={[]}
          tipos={[]}
          categorias={[]}
          companyShort={() => "DR"}
          onGuardarAsignacion={noop}
          onBorrarAsignacion={noop}
          onGuardarGrupo={noop}
          onBorrarGrupo={noop}
          onGuardarTipo={noop}
          onBorrarTipo={noop}
          nuevoId={() => 1}
          mostrarCatalogo={false}
          onAbrirFichaPersonal={aPersonal}
        />
      )
    );
    expect(div.textContent).toContain("Ana Pérez"); // la lista se ve sin abrir nada
    expect(div.textContent).not.toContain("Tareas del día");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("+ Armar"))!.click());
    expect(div.textContent).toContain("Tareas del día");
    act(() => Array.from(div.querySelectorAll("button")).find((b) => b.textContent?.includes("Ficha de personal"))!.click());
    expect(aPersonal).toHaveBeenCalledWith(3);
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(div.textContent).not.toContain("Tareas del día");
    act(() => root.unmount());
  });
});
