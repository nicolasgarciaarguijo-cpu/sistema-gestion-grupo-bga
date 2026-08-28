import { describirTrabajo } from "./jobDescription";

describe("describirTrabajo", () => {
  it("saca la descripcion y los bloques del snapshot del presupuesto", () => {
    const d = describirTrabajo({
      project: "PROYECTO MIGUELETES",
      notes: "EL PRESUPUESTO QUEDA DOLARIZADO A USD 52500",
      snapshot: {
        budget: { notes: "FABRICACIÓN DE MOBILIARIO DE ALTA GAMA A MEDIDA.", scope: "Incluye materiales e insumos." },
        subBudgets: [
          { title: "M01", notes: "SEGÚN PLANO Y CONVERSACIÓN CON MARIASU", quantity: 1 },
          { title: "M02", notes: "Vestidor completo", quantity: 3, currency: "USD" },
        ],
      },
    });
    expect(d.proyecto).toBe("PROYECTO MIGUELETES");
    expect(d.descripcion).toBe("FABRICACIÓN DE MOBILIARIO DE ALTA GAMA A MEDIDA.");
    expect(d.alcance).toBe("Incluye materiales e insumos.");
    expect(d.notas).toBe("EL PRESUPUESTO QUEDA DOLARIZADO A USD 52500");
    expect(d.bloques).toHaveLength(2);
    expect(d.bloques[1]).toEqual({ titulo: "M02", descripcion: "Vestidor completo", cantidad: 3, moneda: "USD" });
    expect(d.vacio).toBe(false);
  });

  it("un bloque sin titulo propio ni descripcion no se muestra", () => {
    const d = describirTrabajo({
      snapshot: { budget: {}, subBudgets: [{ title: "", notes: "" }, { title: "Lavadero", notes: "" }] },
    });
    expect(d.bloques.map((b) => b.titulo)).toEqual(["Lavadero"]);
  });

  it("cantidad ausente o cero se toma como 1", () => {
    const d = describirTrabajo({
      snapshot: { budget: {}, subBudgets: [{ title: "A", notes: "x" }, { title: "B", notes: "y", quantity: 0 }] },
    });
    expect(d.bloques.map((b) => b.cantidad)).toEqual([1, 1]);
  });

  it("un trabajo sin nada cargado avisa que esta vacio", () => {
    expect(describirTrabajo({}).vacio).toBe(true);
    expect(describirTrabajo({ snapshot: { budget: {}, subBudgets: [] } }).vacio).toBe(true);
  });

  it("no explota con un trabajo viejo sin snapshot", () => {
    const d = describirTrabajo({ project: "Los Alamos", notes: "" });
    expect(d.proyecto).toBe("Los Alamos");
    expect(d.bloques).toEqual([]);
  });
});
