import {
  issuedInvoiceKey,
  parseArcaAmount,
  parseArcaDate,
  rowsToIssuedInvoices,
} from "./arcaInvoices";

// Forma real del export de ARCA (titulo, encabezados, comprobantes).
const HEADERS = [
  "Fecha","Tipo","Punto de Venta","Número Desde","Número Hasta","Cód. Autorización",
  "Tipo Doc. Receptor","Nro. Doc. Receptor","Denominación Receptor","Tipo Cambio","Moneda",
  "Neto Grav. IVA 0%","IVA 10,5%","Neto Grav. IVA 10,5%","IVA 21%","Neto Grav. IVA 21%",
  "Imp. Neto Gravado","Imp. Neto No Gravado","Imp. Op. Exentas","IVA","Imp. Total",
];
const fila = (over: Partial<Record<string, string>> = {}) => {
  const base: Record<string, string> = {
    Fecha: "26/11/2025",
    Tipo: "1 - Factura A",
    "Punto de Venta": "1",
    "Número Desde": "107",
    "Nro. Doc. Receptor": "30715274686",
    "Denominación Receptor": "BGA ESTUDIO DE DISEÑO Y PRODUCCION INDUSTRIAL S.R.L.",
    Moneda: "$",
    "Imp. Neto Gravado": "108320533",
    IVA: "22746312",
    "Imp. Total": "131066845",
    ...over,
  };
  return HEADERS.map((h) => base[h] ?? "");
};
const armar = (filas: string[][]) => [
  ["Mis Comprobantes Emitidos - CUIT 30717695409"],
  HEADERS,
  ...filas,
];

describe("parseArcaAmount", () => {
  it("entiende coma decimal y punto de miles", () => {
    expect(parseArcaAmount("1.234.567,89")).toBeCloseTo(1234567.89);
    expect(parseArcaAmount("131066845")).toBe(131066845);
    expect(parseArcaAmount("")).toBe(0);
    expect(parseArcaAmount("$ 1.000,50")).toBeCloseTo(1000.5);
  });
});

describe("parseArcaDate", () => {
  it("pasa dd/mm/yyyy a ISO", () => {
    expect(parseArcaDate("26/11/2025")).toBe("2025-11-26");
    expect(parseArcaDate("5/7/2026")).toBe("2026-07-05");
  });
  it("descarta lo que no entiende", () => {
    expect(parseArcaDate("Totales")).toBe("");
    expect(parseArcaDate("")).toBe("");
  });
});

describe("rowsToIssuedInvoices", () => {
  it("saca el CUIT del emisor del titulo", () => {
    expect(rowsToIssuedInvoices(armar([fila()])).emitterTaxId).toBe("30717695409");
  });

  it("lee el comprobante completo", () => {
    const { invoices } = rowsToIssuedInvoices(armar([fila()]));
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      date: "2025-11-26",
      kind: "1 - Factura A",
      receiverTaxId: "30715274686",
      total: 131066845,
      net: 108320533,
      vat: 22746312,
    });
  });

  // "IVA" esta contenido en "Neto Grav. IVA 21%": si se buscara por "contiene", el IVA traeria el neto.
  it("no confunde la columna IVA con las de Neto Grav. IVA", () => {
    const { invoices } = rowsToIssuedInvoices(armar([fila({ IVA: "999", "Neto Grav. IVA 21%": "77777" })]));
    expect(invoices[0].vat).toBe(999);
  });

  it("descarta filas sin fecha (vacias o de totales)", () => {
    const { invoices } = rowsToIssuedInvoices(
      armar([fila(), fila({ Fecha: "" }), fila({ Fecha: "Totales" })])
    );
    expect(invoices).toHaveLength(1);
  });

  it("si no encuentra los encabezados no inventa nada", () => {
    expect(rowsToIssuedInvoices([["cualquier cosa"], ["otra"]]).invoices).toEqual([]);
    expect(rowsToIssuedInvoices([]).invoices).toEqual([]);
  });

  it("tolera que ARCA mueva las columnas de lugar", () => {
    const headersDadoVuelta = [...HEADERS].reverse();
    const filaDadaVuelta = fila().reverse();
    const r = rowsToIssuedInvoices([
      ["Mis Comprobantes Emitidos - CUIT 30717695409"],
      headersDadoVuelta,
      filaDadaVuelta,
    ]);
    expect(r.invoices[0].total).toBe(131066845);
    expect(r.invoices[0].receiverTaxId).toBe("30715274686");
  });
});

describe("issuedInvoiceKey", () => {
  const base = {
    kind: "1 - Factura A",
    pointOfSale: "1",
    number: "107",
    receiverTaxId: "30715274686",
    date: "2025-11-26",
  };
  it("el mismo comprobante da la misma clave (para no cargarlo dos veces)", () => {
    expect(issuedInvoiceKey(base)).toBe(issuedInvoiceKey({ ...base, pointOfSale: "0001" }));
  });
  it("comprobantes distintos dan claves distintas", () => {
    expect(issuedInvoiceKey(base)).not.toBe(issuedInvoiceKey({ ...base, number: "108" }));
    expect(issuedInvoiceKey(base)).not.toBe(issuedInvoiceKey({ ...base, kind: "3 - Nota de Credito A" }));
  });
});
