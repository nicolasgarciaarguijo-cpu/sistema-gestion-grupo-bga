import {
  compararTitulosDeSubpresupuesto,
  ordenarPorTitulo,
  ordenarSubpresupuestos,
  tituloDeSubpresupuesto,
} from "./budgetSections";

const secciones = (...titles: Array<string | undefined>) => titles.map((title) => ({ title }));
const titulos = (rows: Array<{ title?: string }>) => rows.map((r) => r.title);

describe("ordenarSubpresupuestos", () => {
  it("ordena alfabeticamente sin importar en que orden se guardaron", () => {
    expect(titulos(ordenarSubpresupuestos(secciones("Vestidor", "Cocina", "Oficina")))).toEqual([
      "Cocina",
      "Oficina",
      "Vestidor",
    ]);
  });

  it("no distingue mayusculas ni acentos", () => {
    expect(titulos(ordenarSubpresupuestos(secciones("ávila", "Ana", "Bar")))).toEqual([
      "Ana",
      "ávila",
      "Bar",
    ]);
  });

  it("los numeros van en orden humano: Placard 2 antes que Placard 10", () => {
    expect(
      titulos(ordenarSubpresupuestos(secciones("Placard 10", "Placard 2", "Placard 1")))
    ).toEqual(["Placard 1", "Placard 2", "Placard 10"]);
  });

  it("el bloque sin titulo va al final (su nombre depende de la posicion)", () => {
    const rows = ordenarSubpresupuestos([{ title: "Zocalos" }, { title: "" }, { title: "Alacena" }]);
    expect(rows.map((r, i) => tituloDeSubpresupuesto(r, i))).toEqual([
      "Alacena",
      "Zocalos",
      "Subpresupuesto 3",
    ]);
  });

  it("no muta la lista original y es estable con titulos repetidos", () => {
    const original = [
      { title: "Cocina", id: 1 },
      { title: "Bar", id: 2 },
      { title: "Cocina", id: 3 },
    ];
    const ordenada = ordenarSubpresupuestos(original);
    expect(ordenada.map((r) => r.id)).toEqual([2, 1, 3]);
    expect(original.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("aguanta que no venga nada", () => {
    expect(ordenarSubpresupuestos(undefined as any)).toEqual([]);
  });
});

describe("ordenarPorTitulo", () => {
  it("ordena listas ya transformadas por el campo que se muestra", () => {
    const bloques = [{ titulo: "Vestidor" }, { titulo: "Cocina" }];
    expect(ordenarPorTitulo(bloques, (b) => b.titulo).map((b) => b.titulo)).toEqual([
      "Cocina",
      "Vestidor",
    ]);
  });
});

describe("compararTitulosDeSubpresupuesto", () => {
  it("devuelve 0 cuando solo cambian mayusculas o acentos", () => {
    expect(compararTitulosDeSubpresupuesto("Cocina", "cocína")).toBe(0);
  });
});
