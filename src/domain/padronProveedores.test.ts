import {
  cuitParaRevisar,
  duplicadosDelPadron,
  facturasMellizas,
  normNombre,
  resumenPadron,
  sinCondicionConDeuda,
  sinNadaCargado,
  type ProveedorPadron,
  type UsoProveedor,
} from "./padronProveedores";

// Nicolas, 16/11/2026. Los casos son los que encontré leyendo el padrón de verdad el 14/11: la estación de
// servicio cargada dos veces con el dígito verificador distinto, "Electro practico" vs "Electropractico",
// los 74 sin nada cargado, los 8 sin condición de pago que dejaban $5,9M afuera del cash flow y los dos
// estudios contables facturando lo mismo el mismo día ($2,2M).
const p = (id: number, name: string, taxId = "", extra: Partial<ProveedorPadron> = {}): ProveedorPadron => ({
  id,
  company: "General",
  name,
  taxId,
  ...extra,
});

const vacio: UsoProveedor = { facturas: 0, comprado: 0, pagado: 0, deuda: 0 };
const conDeuda = (deuda: number): UsoProveedor => ({ facturas: 2, comprado: deuda, pagado: 0, deuda });

describe("duplicados del padrón", () => {
  it("el mismo nombre con y sin espacios es el mismo proveedor", () => {
    const g = duplicadosDelPadron([p(1, "Electro practico"), p(2, "Electropractico"), p(3, "Otro")]);
    expect(g).toHaveLength(1);
    expect(g[0].motivo).toBe("nombre");
    expect(g[0].proveedores.map((x) => x.id)).toEqual([1, 2]);
  });

  it("S.R.L. y S.A. no hacen a dos proveedores distintos", () => {
    expect(normNombre("Norteña S.R.L.")).toBe(normNombre("norteña"));
    const g = duplicadosDelPadron([p(1, "Norteña S.R.L."), p(2, "norteña")]);
    expect(g).toHaveLength(1);
  });

  it("el mismo CUIT con dos nombres distintos también es un duplicado", () => {
    const g = duplicadosDelPadron([p(1, "Edenor", "30-65511620-2"), p(2, "EDENOR SA (ARCA)", "30655116202")]);
    expect(g).toHaveLength(1);
    expect(g[0].motivo).toBe("cuit");
  });

  it("el CUIT tipeado con otro dígito verificador se detecta", () => {
    const g = duplicadosDelPadron([
      p(1, "Estación de servicio norteña", "30-70912132-2"),
      p(2, "norteña combustible", "30-70912132-3"),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].motivo).toBe("cuit-digito");
  });

  it("un nombre adentro del otro también los agrupa", () => {
    // Casos reales del padrón: dos Magliola, dos Expocolor, dos Estacionamiento.
    const g = duplicadosDelPadron([
      p(1, "HERRAJES MAGLIOLA  S A"),
      p(2, "Cima de herrajes magliola"),
      p(3, "Expocolor"),
      p(4, "Lacapol EXPOCOLOR"),
    ]);
    expect(g).toHaveLength(2);
    expect(g.every((x) => x.motivo === "contiene")).toBe(true);
  });

  it("un nombre corto no arrastra a otro que lo contenga por casualidad", () => {
    expect(duplicadosDelPadron([p(1, "Dac"), p(2, "Dacar materiales")])).toEqual([]);
  });

  it("un padrón sano no tiene duplicados, y un par no sale dos veces por dos motivos", () => {
    expect(duplicadosDelPadron([p(1, "Dac", "30-11111111-1"), p(2, "Magliola", "30-22222222-2")])).toEqual([]);
    // Mismo nombre Y mismo CUIT: un solo grupo.
    expect(duplicadosDelPadron([p(1, "Dac", "30-11111111-1"), p(2, "DAC", "30-11111111-1")])).toHaveLength(1);
  });
});

describe("proveedores sin nada cargado", () => {
  it("son los que no tienen ni factura ni pago", () => {
    const ps = [p(1, "No Aplica"), p(2, "Dac")];
    const uso = (x: ProveedorPadron) => (x.id === 2 ? conDeuda(1000) : vacio);
    expect(sinNadaCargado(ps, uso).map((x) => x.name)).toEqual(["No Aplica"]);
  });

  it("si tiene plata cargada no se lo propone para borrar, aunque no tenga facturas", () => {
    const uso = () => ({ facturas: 0, comprado: 0, pagado: 5000, deuda: -5000 });
    expect(sinNadaCargado([p(1, "Rapipago")], uso)).toEqual([]);
  });
});

describe("la plata que queda fuera del cash flow", () => {
  it("sin condición de pago y con deuda: ordenados por lo que más pesa", () => {
    const ps = [p(1, "Magliola"), p(2, "Dac"), p(3, "Al día")];
    const uso = (x: ProveedorPadron) => (x.id === 1 ? conDeuda(1725061) : x.id === 2 ? conDeuda(1170164) : vacio);
    const r = sinCondicionConDeuda(ps, uso);
    expect(r.map((x) => x.proveedor.name)).toEqual(["Magliola", "Dac"]);
    expect(r[0].deuda).toBe(1725061);
  });

  it("el débito automático no necesita condición de pago", () => {
    const ps = [p(1, "Edenor", "", { debitoAutomatico: true })];
    expect(sinCondicionConDeuda(ps, () => conDeuda(900000))).toEqual([]);
  });

  it("con condición de pago cargada no aparece", () => {
    const ps = [p(1, "Dac", "", { condicionPago: "30 días" })];
    expect(sinCondicionConDeuda(ps, () => conDeuda(900000))).toEqual([]);
  });
});

describe("CUIT para revisar", () => {
  it("avisa el que falta, el que está corto y el que está repetido", () => {
    const r = cuitParaRevisar([
      p(1, "Sin cuit"),
      p(2, "Corto", "2039492"),
      p(3, "Uno", "20-39492333-9"),
      p(4, "Otro con el mismo", "20394923339"),
      p(5, "Bien", "30-65511620-2"),
    ]);
    expect(r.map((x) => [x.proveedor.id, x.motivo])).toEqual([
      [1, "falta"],
      [2, "corto"],
      [3, "repetido"],
      [4, "repetido"],
    ]);
  });
});

describe("facturas mellizas (el mismo monto el mismo día, de dos proveedores)", () => {
  const f = (id: number, supplier: string, total: number, date = "2026-11-02", company = "De Raiz") => ({
    id,
    company,
    supplier,
    date,
    total,
  });

  it("encuentra el honorario cargado dos veces", () => {
    const m = facturasMellizas([
      f(1, "Ricardo Cusmano", 746428.01),
      f(2, "Franco César Néstor", 746428.01),
      f(3, "Dac", 100000),
    ]);
    expect(m).toHaveLength(1);
    expect(m[0].facturas.map((x) => x.id)).toEqual([1, 2]);
    expect(m[0].total).toBeCloseTo(746428.01);
  });

  it("dos facturas del MISMO proveedor no son mellizas (puede facturar dos veces)", () => {
    expect(facturasMellizas([f(1, "Dac", 50000), f(2, "DAC", 50000)])).toEqual([]);
  });

  it("no mezcla empresas ni días, y descarta los montos en cero", () => {
    expect(facturasMellizas([f(1, "A", 1000), f(2, "B", 1000, "2026-11-02", "BGA")])).toEqual([]);
    expect(facturasMellizas([f(1, "A", 1000), f(2, "B", 1000, "2026-11-03")])).toEqual([]);
    expect(facturasMellizas([f(1, "A", 0), f(2, "B", 0)])).toEqual([]);
  });
});

describe("el resumen del padrón", () => {
  it("cuenta todo junto, con la plata de cada agujero", () => {
    const ps = [p(1, "Electro practico"), p(2, "Electropractico"), p(3, "Magliola")];
    const uso = (x: ProveedorPadron) => (x.id === 3 ? conDeuda(1725061) : vacio);
    const r = resumenPadron(ps, uso, [
      { id: 1, company: "De Raiz", supplier: "Cusmano", date: "2026-11-02", total: 746428 },
      { id: 2, company: "De Raiz", supplier: "Franco", date: "2026-11-02", total: 746428 },
    ]);
    expect(r).toMatchObject({
      total: 3,
      duplicados: 2,
      vacios: 2,
      sinCondicionConDeuda: 1,
      plataFueraDelCashFlow: 1725061,
      cuitParaRevisar: 3,
      mellizas: 1,
      plataMellizas: 746428,
    });
  });
});
