import {
  esPagoDeIva,
  esProveedorDelFisco,
  facturasDelFiscoSinPeriodo,
  periodoDeLaFactura,
  vepsDesdeFacturas,
  type FacturaDeIva,
} from "./pagoDeIva";

// Nicolas, 17/11/2026: "seguir por Compras". El IVA se paga como una factura de ARCA, no con un VEP
// cargado en el tablero. El caso real: nota de débito de "ARCA" de De Raíz, $6.940.676, factura del
// 25/11/2026, que paga el IVA de 08/2026 (lo decía la nota "Aviso de Ceci").
const f = (extra: Partial<FacturaDeIva> = {}): FacturaDeIva => ({
  id: 1,
  company: "De Raiz",
  supplier: "ARCA",
  invoiceDate: "2026-11-25",
  total: 6940676,
  ...extra,
});

describe("quién es el fisco", () => {
  it("reconoce ARCA y AFIP, con o sin mayúsculas", () => {
    expect(esProveedorDelFisco("ARCA")).toBe(true);
    expect(esProveedorDelFisco("arca")).toBe(true);
    expect(esProveedorDelFisco("AFIP - DGI")).toBe(true);
    expect(esProveedorDelFisco("Arca Pinturas")).toBe(true); // empieza con arca: mejor preguntar
  });

  it("no confunde a otro proveedor", () => {
    expect(esProveedorDelFisco("Dac")).toBe(false);
    expect(esProveedorDelFisco("")).toBe(false);
    expect(esProveedorDelFisco("Comercial Arcano")).toBe(false);
  });
});

describe("el período que paga la factura", () => {
  it("usa el período aclarado", () => {
    expect(periodoDeLaFactura(f({ ivaPeriodoMes: "2026-08" }))).toBe("2026-08");
  });

  it("si no se aclaró, toma el mes anterior al de la factura (igual que el VEP)", () => {
    expect(periodoDeLaFactura(f())).toBe("2026-10");
    expect(periodoDeLaFactura(f({ invoiceDate: "2026-01-15" }))).toBe("2025-12");
  });

  it("un período mal escrito no se toma en serio", () => {
    expect(periodoDeLaFactura(f({ ivaPeriodoMes: "agosto" }))).toBe("2026-10");
  });
});

describe("cuándo es un pago del IVA para el tablero", () => {
  it("hace falta el período aclarado Y que esté pagada", () => {
    expect(esPagoDeIva(f({ ivaPeriodoMes: "2026-08", pagadaEl: "2026-11-25" }))).toBe(true);
    expect(esPagoDeIva(f({ ivaPeriodoMes: "2026-08" }))).toBe(false); // impaga: es deuda con ARCA
    expect(esPagoDeIva(f({ pagadaEl: "2026-11-25" }))).toBe(false); // sin período: no se sabe qué paga
  });

  it("la factura pagada se convierte en el VEP de su período", () => {
    expect(vepsDesdeFacturas([f({ ivaPeriodoMes: "2026-08", pagadaEl: "2026-11-25" }), f({ id: 2 })])).toEqual([
      { company: "De Raiz", date: "2026-11-25", amount: 6940676, periodoMes: "2026-08" },
    ]);
  });
});

describe("las facturas de ARCA que no dicen qué período pagan", () => {
  it("se listan para preguntarlas", () => {
    const lista = facturasDelFiscoSinPeriodo([
      f(),
      f({ id: 2, ivaPeriodoMes: "2026-08" }),
      f({ id: 3, supplier: "Dac" }),
    ]);
    expect(lista.map((x) => x.id)).toEqual([1]);
  });
});
