import {
  codigosRepetidos,
  faltaDelArticulo,
  nuevoArticuloStock,
  proximoCodigoStock,
  textoFaltaArticulo,
  type ArticuloStock,
} from "./altaStock";

// Nicolas, 16/11/2026: el articulo de stock se daba de alta desde seis lugares distintos, cada uno
// armando el objeto a mano. Y el codigo, que es con lo que el material del presupuesto encuentra el
// articulo, se calculaba por GRUPO: dos grupos con el mismo prefijo arrancaban los dos en 001. Pasó de
// verdad: ALU-001 quedó en dos articulos distintos ("Zócalo fleje Aluminio" y "perfilería aluminio").
const prefijo = (grupo: string) => (grupo === "Aluminio portaled" || grupo === "Aluminio" ? "ALU" : grupo.slice(0, 3).toUpperCase());

const item = (id: number, code: string, group = "Aluminio"): ArticuloStock => ({
  id,
  company: "BGA",
  kind: "general",
  shared: false,
  group,
  location: "",
  sortOrder: id,
  code,
  description: `art ${id}`,
  unit: "u",
  quantity: 0,
  unitPrice: 0,
  periodicityMonths: 0,
  active: true,
});

describe("el código del artículo de stock", () => {
  it("sigue la numeración del PREFIJO, no la del grupo", () => {
    const items = [item(1, "ALU-001", "Aluminio"), item(2, "ALU-002", "Aluminio")];
    // Otro grupo con el mismo prefijo: antes volvia a 001 y pisaba el codigo.
    expect(proximoCodigoStock(items, "Aluminio portaled", prefijo)).toBe("ALU-003");
    expect(proximoCodigoStock(items, "Aluminio", prefijo)).toBe("ALU-003");
  });

  it("el primero del prefijo arranca en 001 y respeta los tres dígitos", () => {
    expect(proximoCodigoStock([], "Melaminas", prefijo)).toBe("MEL-001");
    expect(proximoCodigoStock([item(1, "MEL-009", "Melaminas")], "Melaminas", prefijo)).toBe("MEL-010");
  });

  it("no se cuenta a sí mismo cuando se recalcula el código de un artículo", () => {
    const items = [item(1, "ALU-001"), item(2, "ALU-002")];
    expect(proximoCodigoStock(items, "Aluminio", prefijo, 2)).toBe("ALU-002");
  });

  it("los códigos de otros prefijos no mueven la cuenta", () => {
    const items = [item(1, "MEL-050", "Melaminas"), item(2, "ALU-001", "Aluminio")];
    expect(proximoCodigoStock(items, "Aluminio", prefijo)).toBe("ALU-002");
  });
});

describe("el alta del artículo, por una sola puerta", () => {
  it("el artículo nuevo sale completo, con el código que le toca", () => {
    const items = [item(1, "ALU-001")];
    const nuevo = nuevoArticuloStock(9, { origen: "stock", company: "BGA", group: "Aluminio", description: "  Perfil  " }, items, prefijo);
    expect(nuevo).toMatchObject({
      id: 9,
      company: "BGA",
      kind: "general",
      group: "Aluminio",
      code: "ALU-002",
      description: "Perfil",
      unit: "u",
      quantity: 0,
      unitPrice: 0,
      periodicityMonths: 0,
      active: true,
      sortOrder: 2,
    });
  });

  it("la máquina y las provisiones de personal se comparten entre las dos empresas", () => {
    expect(nuevoArticuloStock(1, { origen: "maquina", company: "BGA", group: "Maquinas" }, [], prefijo).shared).toBe(true);
    expect(nuevoArticuloStock(2, { origen: "personal", company: "BGA", group: "EPP" }, [], prefijo).shared).toBe(true);
    expect(nuevoArticuloStock(3, { origen: "stock", company: "BGA", group: "Aluminio" }, [], prefijo).shared).toBe(false);
    expect(nuevoArticuloStock(4, { origen: "stock", company: "General", group: "Aluminio" }, [], prefijo).shared).toBe(true);
  });

  it("las provisiones de personal se entregan cada 6 meses y el resto no tiene periodicidad", () => {
    expect(nuevoArticuloStock(1, { origen: "personal", company: "BGA", group: "EPP" }, [], prefijo).periodicityMonths).toBe(6);
    expect(nuevoArticuloStock(2, { origen: "remito", company: "BGA", group: "Aluminio" }, [], prefijo).periodicityMonths).toBe(0);
    expect(nuevoArticuloStock(3, { origen: "personal", company: "BGA", group: "EPP", periodicityMonths: 12 }, [], prefijo).periodicityMonths).toBe(12);
  });

  it("lo que trae el origen manda sobre el valor por defecto", () => {
    const nuevo = nuevoArticuloStock(
      1,
      { origen: "maquina", company: "De Raiz", group: "Maquinas", description: "Escuadradora", quantity: 1, unit: "un", location: "Taller", unitPrice: 500 },
      [],
      prefijo
    );
    expect(nuevo).toMatchObject({ quantity: 1, unit: "un", location: "Taller", unitPrice: 500, company: "De Raiz" });
  });
});

describe("avisos del artículo", () => {
  it("dice qué le falta", () => {
    expect(faltaDelArticulo({ code: "ALU-001", description: "Perfil", group: "Aluminio", unit: "u" })).toEqual([]);
    expect(faltaDelArticulo({})).toEqual(["la descripción", "el código", "el grupo", "la unidad"]);
    expect(textoFaltaArticulo(["el código"])).toBe("⚠ falta el código");
    expect(textoFaltaArticulo([])).toBe("");
  });

  it("encuentra los códigos repetidos (el material del presupuesto cruza por código)", () => {
    const repetidos = codigosRepetidos([
      { id: 1, code: "ALU-001", description: "Zócalo fleje Aluminio 100mm" },
      { id: 2, code: "alu-001", description: "perfilería aluminio portaled" },
      { id: 3, code: "ALU-002", description: "otro" },
      { id: 4, code: "", description: "sin código" },
    ]);
    expect(Array.from(repetidos.keys())).toEqual(["ALU-001"]);
    expect(repetidos.get("ALU-001")).toHaveLength(2);
  });
});
