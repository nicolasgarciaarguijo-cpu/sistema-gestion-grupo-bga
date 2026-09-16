import { resumirMaterialesDelTrabajo } from "./jobMaterials";

const mat = (description: string, qty: number, unit = "u") => ({ description, qty, unit, unitPrice: 999 });

const job = (snapshot: any) => ({ id: 1, snapshot });

describe("resumirMaterialesDelTrabajo", () => {
  it("separa los materiales por subpresupuesto, con descripcion, unidad y cantidad", () => {
    const r = resumirMaterialesDelTrabajo(
      job({
        subBudgets: [
          { title: "Mesa", notes: "roble", materials: [mat("Tabla roble", 4, "m2")], basicSupplies: [] },
          { title: "Sillas", materials: [mat("Caño 20x20", 12, "ml")], basicSupplies: [mat("Tornillos", 50)] },
        ],
        materials: [],
        basicSupplies: [],
      })
    );
    expect(r.vacio).toBe(false);
    expect(r.bloques.map((b) => b.titulo)).toEqual(["Mesa", "Sillas"]);
    expect(r.bloques[0].filas).toEqual([
      { descripcion: "Tabla roble", unidad: "m2", cantidadPorUnidad: 4, cantidad: 4, tipo: "material" },
    ]);
    expect(r.bloques[1].filas.map((f) => [f.descripcion, f.cantidad, f.tipo])).toEqual([
      ["Caño 20x20", 12, "material"],
      ["Tornillos", 50, "insumo"],
    ]);
  });

  it("escala la cantidad por las N unidades cotizadas del bloque", () => {
    const r = resumirMaterialesDelTrabajo(
      job({ subBudgets: [{ title: "Puerta", quantity: 3, materials: [mat("Bisagra", 2)], basicSupplies: [] }] })
    );
    expect(r.bloques[0].unidades).toBe(3);
    expect(r.bloques[0].filas[0]).toMatchObject({ cantidadPorUnidad: 2, cantidad: 6 });
  });

  it("junta el mismo material repetido dentro del bloque y lo consolida entre bloques", () => {
    const r = resumirMaterialesDelTrabajo(
      job({
        subBudgets: [
          { title: "A", materials: [mat("Tornillo", 10), mat(" tornillo ", 5)], basicSupplies: [] },
          { title: "B", quantity: 2, materials: [mat("Tornillo", 3)], basicSupplies: [] },
        ],
      })
    );
    expect(r.bloques[0].filas).toHaveLength(1);
    expect(r.bloques[0].filas[0].cantidad).toBe(15);
    expect(r.consolidado).toHaveLength(1);
    expect(r.consolidado[0].cantidad).toBe(21); // 15 + 3x2
  });

  it("ignora los renglones vacios de la planilla", () => {
    const r = resumirMaterialesDelTrabajo(
      job({ subBudgets: [{ title: "A", materials: [mat("", 0), mat("   ", 5), mat("Chapa", 1)], basicSupplies: [] }] })
    );
    expect(r.bloques[0].filas.map((f) => f.descripcion)).toEqual(["Chapa"]);
  });

  it("presupuesto viejo sin subpresupuestos: muestra el bloque suelto", () => {
    const r = resumirMaterialesDelTrabajo(
      job({ subBudgets: [], materials: [mat("Madera", 7)], basicSupplies: [mat("Cola", 1, "kg")] })
    );
    expect(r.bloques).toHaveLength(1);
    expect(r.bloques[0].titulo).toBe("Presupuesto");
    expect(r.bloques[0].filas.map((f) => f.descripcion)).toEqual(["Madera", "Cola"]);
  });

  it("no duplica el bloque que quedo en pantalla despues de guardarlo como subpresupuesto", () => {
    const filas = [mat("Madera", 7)];
    const r = resumirMaterialesDelTrabajo(
      job({
        subBudgets: [{ title: "Mueble", materials: filas, basicSupplies: [] }],
        materials: filas,
        basicSupplies: [],
      })
    );
    expect(r.bloques).toHaveLength(1);
    expect(r.consolidado[0].cantidad).toBe(7);
  });

  it("si el bloque suelto tiene contenido propio, se muestra aparte", () => {
    const r = resumirMaterialesDelTrabajo(
      job({
        subBudgets: [{ title: "Mueble", materials: [mat("Madera", 7)], basicSupplies: [] }],
        materials: [mat("Vidrio", 2)],
        basicSupplies: [],
      })
    );
    expect(r.bloques.map((b) => b.titulo)).toEqual(["Mueble", "Bloque sin guardar como subpresupuesto"]);
    expect(r.consolidado).toHaveLength(2);
  });

  it("trabajo sin snapshot util: vacio, no rompe", () => {
    expect(resumirMaterialesDelTrabajo(undefined).vacio).toBe(true);
    expect(resumirMaterialesDelTrabajo(job({})).bloques).toEqual([]);
    expect(resumirMaterialesDelTrabajo(job({ subBudgets: [{ title: "A" }] })).vacio).toBe(true);
  });
});
