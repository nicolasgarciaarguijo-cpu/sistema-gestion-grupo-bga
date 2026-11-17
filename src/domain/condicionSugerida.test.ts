import { condicionSugerida, textoDeCondicion } from "./condicionSugerida";

// Nicolas, 16/11/2026. Los casos son del historial real: a Cima de herrajes Magliola se le pagaron las
// facturas de septiembre el 16 y el 22 de octubre; y a Dac hay facturas de 2026 pagadas con cheques al
// 22/04/2027, que no son su plazo comercial y no tienen que ensuciar el promedio.
const p = (invoiceDate: string, paymentDate: string) => ({ invoiceDate, paymentDate });

describe("la condición que sale del historial", () => {
  it("promedia los días y lo lleva al plazo habitual más cercano", () => {
    // 43 y 44 días -> 45.
    const s = condicionSugerida([p("2026-09-03", "2026-10-16"), p("2026-09-08", "2026-10-22")])!;
    expect(s.condicion).toEqual({ tipo: "dias", dias: 45 });
    expect(s.texto).toBe("a 45 días");
    expect(s.muestras).toBe(2);
    expect(s.descartados).toBe(0);
  });

  it("si se le paga el mismo día, es contado", () => {
    const s = condicionSugerida([p("2026-10-29", "2026-10-29"), p("2026-11-11", "2026-11-12")])!;
    expect(s.condicion).toEqual({ tipo: "contado" });
    expect(s.texto).toBe("contado");
  });

  it("si siempre se paga el mismo día del mes, es un vencimiento fijo", () => {
    const s = condicionSugerida([
      p("2026-08-20", "2026-09-10"),
      p("2026-09-18", "2026-10-10"),
      p("2026-10-15", "2026-11-10"),
    ])!;
    expect(s.condicion).toEqual({ tipo: "diaDelMes", dia: 10 });
    expect(s.texto).toBe("el 10 de cada mes");
  });

  it("los cheques a fecha no se promedian, pero se cuentan", () => {
    // Dos pagos a ~50 días y un cheque al 22/04/2027 (más de 180 días).
    const s = condicionSugerida([
      p("2026-08-27", "2026-10-16"),
      p("2026-09-07", "2026-10-30"),
      p("2026-10-14", "2027-04-22"),
    ])!;
    expect(s.condicion).toEqual({ tipo: "dias", dias: 45 });
    expect(s.muestras).toBe(2);
    expect(s.descartados).toBe(1);
  });

  it("un pago con fecha anterior a la factura se descarta", () => {
    const s = condicionSugerida([p("2026-10-10", "2026-09-01"), p("2026-09-01", "2026-10-01"), p("2026-09-05", "2026-10-05")])!;
    expect(s.descartados).toBe(1);
    expect(s.condicion).toEqual({ tipo: "dias", dias: 30 });
  });

  it("con menos de dos pagos creíbles no sugiere nada", () => {
    expect(condicionSugerida([])).toBeNull();
    expect(condicionSugerida([p("2026-10-02", "2026-11-06")])).toBeNull();
    expect(condicionSugerida([p("2026-01-02", "2027-11-06"), p("2026-01-02", "2027-11-06")])).toBeNull();
  });

  it("las fechas que no se entienden no rompen nada", () => {
    expect(condicionSugerida([p("", ""), p("x", "y")])).toBeNull();
  });
});

describe("cómo se lee una condición", () => {
  it("la dice en palabras", () => {
    expect(textoDeCondicion(undefined)).toBe("sin condición");
    expect(textoDeCondicion({ tipo: "contado" })).toBe("contado");
    expect(textoDeCondicion({ tipo: "dias", dias: 30 })).toBe("a 30 días");
    expect(textoDeCondicion({ tipo: "diaDelMes", dia: 5 })).toBe("el 5 de cada mes");
  });
});
