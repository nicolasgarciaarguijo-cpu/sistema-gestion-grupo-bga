import { parseArNumber, extractAmount, extractDate, extractSupplier, parseTicket } from "./ocr";

describe("parseArNumber", () => {
  it("formato argentino con miles y decimales", () => {
    expect(parseArNumber("1.234,56")).toBe(1234.56);
    expect(parseArNumber("$ 12.500,00")).toBe(12500);
  });
  it("solo decimales con coma", () => {
    expect(parseArNumber("1234,56")).toBe(1234.56);
  });
  it("formato con punto decimal", () => {
    expect(parseArNumber("1234.56")).toBe(1234.56);
  });
  it("solo miles con punto", () => {
    expect(parseArNumber("12.500")).toBe(12500);
  });
});

describe("extractAmount", () => {
  it("prioriza el importe que sigue a TOTAL, ignorando SUBTOTAL", () => {
    const text = "SUBTOTAL 10.000,00\nIVA 2.100,00\nTOTAL $ 12.100,00";
    expect(extractAmount(text)).toBe(12100);
  });
  it("sin TOTAL usa el importe mas grande", () => {
    const text = "Ferreteria\nTornillos 500,00\nPintura 3.250,50";
    expect(extractAmount(text)).toBe(3250.5);
  });
  it("sin importes = 0", () => {
    expect(extractAmount("ticket sin numeros")).toBe(0);
  });
});

describe("extractDate", () => {
  it("dd/mm/aaaa a ISO", () => {
    expect(extractDate("Fecha: 15/07/2026")).toBe("2026-07-15");
  });
  it("dd-mm-aa a ISO", () => {
    expect(extractDate("05-03-26 10:30")).toBe("2026-03-05");
  });
  it("fecha invalida = vacio", () => {
    expect(extractDate("45/45/2026")).toBe("");
    expect(extractDate("sin fecha")).toBe("");
  });
});

describe("extractSupplier", () => {
  it("toma la primera linea con letras", () => {
    expect(extractSupplier("FERRETERIA EL TORNILLO\n15/07/2026\nTOTAL 5000")).toBe(
      "FERRETERIA EL TORNILLO"
    );
  });
});

describe("parseTicket", () => {
  it("arma monto, fecha y proveedor de un ticket tipico", () => {
    const text = "FERRETERIA CENTRAL\nCUIT 30-123\n15/07/2026\nTornillos 1.200,00\nTOTAL $ 1.452,00";
    expect(parseTicket(text)).toEqual({
      amount: 1452,
      date: "2026-07-15",
      supplier: "FERRETERIA CENTRAL",
    });
  });
});
