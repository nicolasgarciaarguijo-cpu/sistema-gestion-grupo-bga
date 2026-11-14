import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaProveedor } from "./FichaProveedor";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 2026-11-14: "esa seleccion de empresa quiero que se llame PROVEEDOR DE", y las dos empresas
// ("General") tienen que poder elegirse DENTRO de la ficha, no solo en la ventana de datos.
const EMPRESAS = [
  { value: "BGA", label: "BGA", short: "BGA" },
  { value: "De Raíz", label: "De Raíz", short: "DR" },
  { value: "General", label: "Ambas (compartido)", short: "Ambas" },
];

const prov = (extra: any = {}) => ({
  id: 7,
  name: "Dac Maderas",
  taxId: "30-11111111-9",
  aliases: "",
  company: "De Raíz",
  notes: "",
  ...extra,
});

const abrir = (proveedor: any, onUpdateProveedor: (id: number, field: string, value: unknown) => void = () => {}) => {
  const div = document.createElement("div");
  const root = createRoot(div);
  act(() =>
    root.render(
      <FichaProveedor
        nombre="Dac Maderas"
        taxId="30-11111111-9"
        proveedor={proveedor}
        empresasProveedor={EMPRESAS}
        porPagar={[]}
        renglonesEgreso={[]}
        fvPorRenglon={{}}
        money={(n: number) => `$${n}`}
        onUpdateProveedor={onUpdateProveedor}
        onAltaProveedor={() => {}}
        onCerrar={() => {}}
      />
    )
  );
  return { div, root };
};

const selectDeProveedorDe = (div: HTMLElement): HTMLSelectElement => {
  const cajas = Array.from(div.querySelectorAll("div"));
  const caja = cajas.find((d) => d.firstElementChild?.textContent === "Proveedor de");
  if (!caja) throw new Error("no aparece el bloque 'Proveedor de' en la ficha");
  return caja.querySelector("select") as HTMLSelectElement;
};

describe("Proveedor de (dentro de la ficha)", () => {
  it("la ficha tiene el bloque y se llama 'Proveedor de'", () => {
    const { div, root } = abrir(prov());
    expect(div.textContent).toContain("Proveedor de");
    expect(div.textContent).not.toContain("Empresa (la que paga)");
    act(() => root.unmount());
  });

  it("ofrece las dos empresas y también 'las dos'", () => {
    const { div, root } = abrir(prov());
    const sel = selectDeProveedorDe(div);
    const opciones = Array.from(sel.options).map((o) => o.value);
    expect(opciones).toEqual(["BGA", "De Raíz", "General"]);
    expect(Array.from(sel.options).map((o) => o.textContent)).toContain("Las dos empresas (compartido)");
    act(() => root.unmount());
  });

  it("muestra de quién es hoy el proveedor", () => {
    const { div, root } = abrir(prov());
    expect(selectDeProveedorDe(div).value).toBe("De Raíz");
    act(() => root.unmount());
  });

  it("elegir 'las dos' lo guarda en el proveedor", () => {
    const tocados: any[] = [];
    const { div, root } = abrir(prov(), (id: number, field: string, value: unknown) => { tocados.push({ id, field, value }); });
    const sel = selectDeProveedorDe(div);
    act(() => {
      sel.value = "General";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(tocados).toEqual([{ id: 7, field: "company", value: "General" }]);
    act(() => root.unmount());
  });

  it("el que es de las dos lo dice", () => {
    const { div, root } = abrir(prov({ company: "General" }));
    expect(div.textContent).toContain("Le compran las dos");
    act(() => root.unmount());
  });
});
