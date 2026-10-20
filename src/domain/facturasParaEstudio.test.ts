import { filasParaEstudio, rangoDelMes, COLUMNAS_ESTUDIO } from "./facturasParaEstudio";
import { crc32, libroXlsx, serieExcel, utf8 } from "../lib/xlsx";

const base = {
  company: "De Raíz",
  administration: "blanco" as const,
  supplier: "DAC Maderas",
  taxId: "30-11111111-1",
  receiptLetter: "A",
  invoiceNumber: "0001-00000123",
  exemptAmount: 0,
  net21: 1000,
  vat: 210,
  otrosImpuestos: 0,
  iibb: 30,
  total: 1240,
};

describe("facturas para el estudio contable", () => {
  it("las del rango y de la empresa, blancas, en el orden de las columnas pedidas", () => {
    const filas = filasParaEstudio({
      facturas: [
        { ...base, invoiceDate: "2026-10-05" },
        { ...base, invoiceDate: "2026-09-30" }, // fuera del mes
        { ...base, invoiceDate: "2026-10-06", administration: "negro" }, // negro: no va
        { ...base, invoiceDate: "2026-10-07", company: "BGA" }, // otra empresa
      ],
      empresa: "De Raíz",
      ...rangoDelMes("2026-10"),
    });
    expect(filas[0]).toEqual(COLUMNAS_ESTUDIO);
    expect(filas[1]).toEqual(["DAC Maderas", "30-11111111-1", { fecha: "2026-10-05" }, "Factura", "A", "0001-00000123", 0, 1000, 210, 0, 30, 1240]);
    expect(filas).toHaveLength(4); // titulos + 1 + blanco + totales
    expect(filas[3].slice(6)).toEqual([0, 1000, 210, 0, 30, 1240]);
  });

  it("las notas de credito van en negativo para que la suma de bien", () => {
    const filas = filasParaEstudio({
      facturas: [{ ...base, invoiceDate: "2026-10-05" }],
      notasCredito: [{ company: "De Raíz", supplier: "DAC Maderas", date: "2026-10-10", receiptLetter: "A", number: "0001-1", vat: 21, total: 121 }],
      empresa: "__ALL__",
      desde: "2026-10-01",
      hasta: "2026-10-31",
    });
    expect(filas[2]).toEqual(["DAC Maderas", "", { fecha: "2026-10-10" }, "Nota de crédito", "A", "0001-1", 0, -100, -21, 0, 0, -121]);
    expect(filas[filas.length - 1][11]).toBe(1119);
  });

  it("rango del mes", () => {
    expect(rangoDelMes("2026-02")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
  });
});

describe("xlsx", () => {
  it("crc32 conocido", () => {
    expect(crc32(utf8("hello"))).toBe(0x3610a686);
  });
  it("fecha de Excel", () => {
    expect(serieExcel("2026-10-20")).toBe(46315);
  });
  it("arma un zip valido", () => {
    const z = libroXlsx("Facturas", [["a", 1], ["b", { fecha: "2026-10-20" }]]);
    expect(Array.from(z.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const fin = z.length - 22;
    expect(Array.from(z.slice(fin, fin + 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});
