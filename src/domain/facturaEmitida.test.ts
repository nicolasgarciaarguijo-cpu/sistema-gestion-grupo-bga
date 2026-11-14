import {
  claveDeFacturaEmitida,
  comoComprobanteArca,
  duplicadasDe,
  duplicadosDeFacturasEmitidas,
  faltaDeFacturaEmitida,
  numeroDeFactura,
  puntoDeVentaDeFactura,
  sePuedeCruzarConArca,
  tipoDeFactura,
  textoDuplicada,
  type FacturaEmitidaRef,
} from "./facturaEmitida";
import { arcaInvoiceKey } from "../lib/arcaInvoices";

// Nicolas, 14/11/2026: "la ficha de facturas emitidas debería tener la información necesaria como las trae
// las facturas de ARCA. por lo que si nos falta información en las fichas de trabajo aprobado entonces
// deberíamos corregirlo" + "hay que asegurarse de que no haya facturas emitidas duplicadas".
const completa = {
  invoiceType: "1 - Factura A",
  pointOfSale: "1",
  invoiceNumber: "383",
  invoiceDate: "2026-11-10",
  taxId: "30-69115033-6",
  businessName: "Cliente SA",
  currency: "ARS",
};

describe("la factura del trabajo entendida como la ve ARCA", () => {
  it("lo cargado viejo dice solo la letra: se interpreta con el código de ARCA", () => {
    expect(tipoDeFactura({ invoiceType: "A" })).toBe("1 - Factura A");
    expect(tipoDeFactura({ invoiceType: "B" })).toBe("6 - Factura B");
    expect(tipoDeFactura({ invoiceType: "A 75" })).toBe("1 - Factura A");
    expect(tipoDeFactura({ invoiceType: "1 - Factura A" })).toBe("1 - Factura A");
  });

  it("lo que emitió el sistema por AFIP manda sobre lo tipeado", () => {
    expect(tipoDeFactura({ invoiceType: "B", afipCbteTipo: 1 })).toBe("1 - Factura A");
    expect(puntoDeVentaDeFactura({ pointOfSale: "9", afipPtoVta: 3 })).toBe("3");
    expect(numeroDeFactura({ invoiceNumber: "77", afipCbteNro: 412 })).toBe("412");
  });

  it("el número con el punto de venta adentro se entiende igual", () => {
    expect(puntoDeVentaDeFactura({ invoiceNumber: "00001-00000010" })).toBe("00001");
    expect(numeroDeFactura({ invoiceNumber: "00001-00000010" })).toBe("00000010");
    expect(numeroDeFactura({ invoiceNumber: "011" })).toBe("011");
    expect(numeroDeFactura({ invoiceNumber: "A 75" })).toBe("75");
  });

  it("dos facturas en el mismo renglón no se pueden cruzar", () => {
    expect(numeroDeFactura({ invoiceNumber: "A 352/365" })).toBe("");
    expect(faltaDeFacturaEmitida({ ...completa, invoiceNumber: "A 352/365" })).toContain("el número");
  });

  it("la ficha completa se puede cruzar y arma la MISMA clave que el listado de ARCA", () => {
    expect(faltaDeFacturaEmitida(completa)).toEqual([]);
    expect(sePuedeCruzarConArca(completa)).toBe(true);
    expect(claveDeFacturaEmitida(completa)).toBe(
      arcaInvoiceKey({ kind: "1 - Factura A", pointOfSale: "0001", number: "00000383", counterpartyTaxId: "30691150336", date: "2026-11-10" })
    );
  });

  it("avisa cada dato que falta para cruzarla con ARCA", () => {
    expect(faltaDeFacturaEmitida({})).toEqual([
      "el tipo de comprobante",
      "el punto de venta",
      "el número",
      "la fecha",
      "el CUIT del cliente",
    ]);
    expect(faltaDeFacturaEmitida({ ...completa, pointOfSale: "" })).toEqual(["el punto de venta"]);
    expect(faltaDeFacturaEmitida({ ...completa, taxId: "123" })).toEqual(["el CUIT del cliente"]);
    expect(comoComprobanteArca({ ...completa, invoiceDate: "" })).toBeNull();
  });
});

describe("facturas emitidas duplicadas", () => {
  const ref = (id: number, origen: "trabajo" | "entreEmpresas", donde: string, extra: any = {}): FacturaEmitidaRef => ({
    ...completa,
    ...extra,
    id,
    origen,
    donde,
  });

  it("el mismo comprobante en un trabajo y entre empresas es un duplicado", () => {
    const todas = [ref(1, "trabajo", "trabajo P-3162"), ref(2, "entreEmpresas", "entre empresas")];
    const otras = duplicadasDe(todas[0], todas);
    expect(otras).toHaveLength(1);
    expect(textoDuplicada(otras)).toBe("⚠ este comprobante ya está cargado en entre empresas");
    expect(duplicadosDeFacturasEmitidas(todas)).toHaveLength(1);
  });

  it("no se cuenta a sí misma, y dos comprobantes distintos no son duplicado", () => {
    const todas = [ref(1, "trabajo", "trabajo P-3162"), ref(2, "trabajo", "trabajo P-3259", { invoiceNumber: "384" })];
    expect(duplicadasDe(todas[0], todas)).toEqual([]);
    expect(duplicadosDeFacturasEmitidas(todas)).toEqual([]);
    expect(textoDuplicada([])).toBe("");
  });

  it("mismo id en lugares distintos no se confunde", () => {
    const todas = [ref(7, "trabajo", "trabajo P-3162"), ref(7, "entreEmpresas", "entre empresas")];
    expect(duplicadasDe(todas[0], todas)).toHaveLength(1);
  });

  it("si le falta un dato no se declara duplicada (no se puede saber)", () => {
    const todas = [
      ref(1, "trabajo", "trabajo P-3162", { pointOfSale: "", invoiceNumber: "A 352/365" }),
      ref(2, "entreEmpresas", "entre empresas", { pointOfSale: "", invoiceNumber: "A 352/365" }),
    ];
    expect(duplicadasDe(todas[0], todas)).toEqual([]);
    expect(duplicadosDeFacturasEmitidas(todas)).toEqual([]);
  });
});
