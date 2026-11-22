import { aNumero, aplicarPrecios, compararPlanilla, leerPlanilla, tildadosPorDefecto, type HojaPlanilla } from "./planillaStock";

// Nicolas, 21/11/2026: el stock se vincula con la planilla de costos; un boton la lee y actualiza los precios.
const hojas: HojaPlanilla[] = [
  { nombre: "Resumen", filas: [["Planilla de costos"], ["Todos los precios son COSTO NETO"]] },
  {
    nombre: "Melaminas",
    filas: [
      ["Código", "Descripción", "Unidad", "Costo neto"],
      ["MEL-001", "Melamina s/Fibro 18mm GUAYUBIRA", "u", 150000],
      ["mel-002", "Melamina s/Fibro 18mm CARRARA", "u", "122.195,04"],
      ["MEL-003", "Melamina NATIVA", "u", ""],
      ["", "fila suelta sin código", "", 5],
    ],
  },
  {
    nombre: "Hierro",
    filas: [
      ["Código", "Descripción", "Rubro", "Unidad", "Kg/barra", "Precio lista $/kg", "Costo neto"],
      ["HIE-001", "H. PLANCHUELA 1/2 x 1/8", "Planchuela", "barra", 2, 3132.1728, ""],
      ["HIE-002", "H. PLANCHUELA 5 x 3/4", "Planchuela", "barra", 113.92, 3256.448, 371000],
      ["HIE-532", "CHAPA LISA", "Chapas", "m2", "", 2268.26, ""],
    ],
  },
];

describe("leer la planilla", () => {
  it("numeros a la argentina y a la inglesa", () => {
    expect(aNumero("1.234,56")).toBe(1234.56);
    expect(aNumero("1234.56")).toBe(1234.56);
    expect(aNumero("$ 5.000")).toBe(null); // ambiguo sin coma: no se adivina
    expect(aNumero(7)).toBe(7);
    expect(aNumero("")).toBe(null);
    expect(aNumero("Consultar")).toBe(null);
  });

  it("lee las hojas con Código y precio; saltea las demas", () => {
    const r = leerPlanilla(hojas);
    expect(r.hojasLeidas).toEqual(["Melaminas", "Hierro"]);
    expect(r.hojasSalteadas).toEqual(["Resumen"]);
    expect(r.filas.map((f) => [f.codigo, f.precio])).toEqual([
      ["MEL-001", 150000],
      ["MEL-002", 122195.04],
      ["MEL-003", null],
      ["HIE-001", 6264.35], // la formula sin calcular: Kg/barra x $/kg
      ["HIE-002", 371000], // el costo neto cargado gana a la cuenta
      ["HIE-532", 2268.26], // sin Kg/barra: el precio de lista tal cual
    ]);
    expect(r.filas[0].fila).toBe(2);
  });
});

describe("comparar contra el stock", () => {
  const stock = [
    { id: 1, code: "MEL-001", description: "Melamina s/Fibro 18mm GUAYUBIRA", unitPrice: 137519.83 },
    { id: 2, code: "MEL-002", description: "Melamina s/Fibro 18mm CARRARA", unitPrice: 122195.04 },
    { id: 3, code: "MEL-003", description: "Melamina NATIVA", unitPrice: 100 },
    { id: 4, code: "HIE-001", description: "H. PLANCHUELA 1/2 x 1/8 (2 kg/barra)", unitPrice: 7000 },
    { id: 5, code: "ALU-001", description: "Zócalo", unitPrice: 10 },
    { id: 6, code: "ALU-001", description: "Portaled", unitPrice: 20 },
    { id: 7, code: "", description: "sin código", unitPrice: 1 },
  ];
  const filas = [
    ...leerPlanilla(hojas).filas,
    { hoja: "Varios", fila: 2, codigo: "ALU-001", descripcion: "Portaled", unidad: "u", precio: 30 },
    { hoja: "Varios", fila: 3, codigo: "NUE-001", descripcion: "Algo nuevo", unidad: "u", precio: 30 },
  ];
  const c = compararPlanilla(filas, stock);

  it("separa lo que sube, lo que baja y lo que queda igual", () => {
    expect(c.suben.map((x) => [x.codigo, x.antes, x.despues, x.pct])).toEqual([["MEL-001", 137519.83, 150000, 9.1]]);
    expect(c.bajan.map((x) => [x.codigo, x.antes, x.despues])).toEqual([["HIE-001", 7000, 6264.35]]);
    expect(c.iguales).toBe(1);
  });

  it("lo que no se puede aplicar sale con su motivo", () => {
    const m = Object.fromEntries(c.noAplicables.map((n) => [n.codigo, n.motivo]));
    expect(m["MEL-003"]).toContain("no tiene precio");
    expect(m["NUE-001"]).toContain("no está en el stock");
    expect(m["ALU-001"]).toContain("está en 2 artículos");
    expect(m["HIE-002"]).toContain("no está en el stock");
    expect(m["HIE-532"]).toContain("no está en el stock");
  });

  it("cuenta los articulos del sistema que la planilla no trae (los sin codigo no cuentan)", () => {
    expect(compararPlanilla([], stock).faltanEnPlanilla).toBe(5);
    expect(c.faltanEnPlanilla).toBe(0);
  });

  it("el mismo codigo dos veces con precios distintos no se aplica", () => {
    const r = compararPlanilla(
      [
        { hoja: "A", fila: 2, codigo: "MEL-001", descripcion: "x", unidad: "u", precio: 1 },
        { hoja: "B", fila: 2, codigo: "MEL-001", descripcion: "x", unidad: "u", precio: 2 },
      ],
      stock
    );
    expect(r.suben).toEqual([]);
    expect(r.noAplicables[0].motivo).toContain("precios distintos");
  });

  it("por defecto se tildan solo las subas con la misma descripcion", () => {
    expect(tildadosPorDefecto(c)).toEqual([1]);
    const dudoso = compararPlanilla([{ hoja: "A", fila: 2, codigo: "MEL-001", descripcion: "Tornillo 4x40", unidad: "u", precio: 999999 }], stock);
    expect(dudoso.suben[0].descripcionDistinta).toBe(true);
    expect(tildadosPorDefecto(dudoso)).toEqual([]);
  });

  it("aplicar cambia solo el precio de los elegidos", () => {
    const r = aplicarPrecios(stock, [{ id: 1, despues: 150000 }]);
    expect(r[0]).toEqual({ ...stock[0], unitPrice: 150000 });
    expect(r.slice(1)).toEqual(stock.slice(1));
    expect(aplicarPrecios(stock, [])).toBe(stock);
  });
});
