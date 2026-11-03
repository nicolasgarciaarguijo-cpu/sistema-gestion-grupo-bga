import { lineasDeItems, pareceTexto } from "./pdfLineas";

const item = (str: string, x: number, y: number, width: number) => ({ str, transform: [1, 0, 0, 1, x, y], width });

describe("lineas de un PDF", () => {
  it("junta los textos del mismo renglon de izquierda a derecha, con doble espacio en los huecos de columna", () => {
    const l = lineasDeItems([
      item("27.045,12", 400, 500, 40),
      item("04.01.26", 20, 500.5, 35),
      item("AUTOPISTAS", 120, 501, 50),
      item("SALDO ACTUAL", 20, 480, 60),
      item("URBAN", 172, 500, 30),
    ]);
    expect(l).toEqual(["04.01.26  AUTOPISTAS URBAN  27.045,12", "SALDO ACTUAL"]);
  });
});

describe("pareceTexto", () => {
  it("texto de una factura: si; bytes de una fuente embebida: no", () => {
    expect(pareceTexto("Factura Nº: 00010-00003144 Fecha: 24/08/2023 Total: $ 67.500,00 CUIT 20-18182064-1")).toBe(true);
    expect(pareceTexto("Adobe UCS ¹v  E:± -, E°%Ead°PQXED!!Y-, E° C`D-,°C°Ce -, i°@a° ‹ ±,ÀŠŒ¸ b`+d#da\X°aY")).toBe(false);
    expect(pareceTexto("")).toBe(false);
  });
});
