import { agregar, listaVigente, mover, nombresActivos, prefijoDeGrupo, quitar, renombrar, cambiar } from "./listasSistema";

describe("listados del sistema (Nicolas, 31/10/2026)", () => {
  it("sin tocar, valen los de siempre; tocados, mandan", () => {
    expect(nombresActivos({}, "tiposTrabajo")).toContain("Cocina");
    const listas = { tiposTrabajo: [{ nombre: "General" }, { nombre: "Baño" }, { nombre: "Placard", activo: false }] };
    expect(nombresActivos(listas, "tiposTrabajo")).toEqual(["General", "Baño"]);
    expect(listaVigente(listas, "tiposTrabajo")).toHaveLength(3);
  });

  it("agregar no repite; renombrar y borrar respetan los del sistema y lo que está en uso", () => {
    const l = listaVigente({}, "tiposTrabajo");
    expect(agregar(l, " cocina ").ok).toBe(false);
    const r = agregar(l, "Baño");
    expect(r.ok && r.lista[r.lista.length - 1]).toEqual({ nombre: "Baño" });
    expect(renombrar("tiposTrabajo", l, "General", "Todos").ok).toBe(false);
    expect(renombrar("tiposTrabajo", l, "Cocina", "Vestidor").ok).toBe(false);
    const rr = renombrar("tiposTrabajo", l, "Cocina", "Cocinas");
    expect(rr.ok && rr.lista.map((x) => x.nombre)).toContain("Cocinas");
    expect(quitar("tiposTrabajo", l, "Cocina", 3).ok).toBe(false);
    expect(quitar("tiposTrabajo", l, "General", 0).ok).toBe(false);
    expect(quitar("tiposTrabajo", l, "Cocina", 0).ok).toBe(true);
    expect(mover(l, "Mobiliario", -1)[0].nombre).toBe("Mobiliario");
    expect(cambiar(l, "Cocina", { activo: false }).find((x) => x.nombre === "Cocina")?.activo).toBe(false);
  });

  it("el prefijo del código: el cargado, el de siempre o las tres primeras letras", () => {
    expect(prefijoDeGrupo({}, "Melaminas")).toBe("MEL");
    expect(prefijoDeGrupo({ gruposStock: [{ nombre: "Melaminas", codigo: "mlm" }] }, "Melaminas")).toBe("MLM");
    expect(prefijoDeGrupo({}, "Vidrios")).toBe("VID");
  });
});
