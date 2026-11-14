import {
  claveDeFacturaEmitida,
  codigoAfipDeFactura,
  COMPROBANTES_AFIP,
  esRepartida,
  puedeEmitirloElSistema,
  repartoDeFactura,
  textoReparto,
  TIPOS_FACTURA_EMITIDA,
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
const nombre = (c: { codigo: number; label: string }) => c.codigo + " - " + c.label;

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
    expect(tipoDeFactura({ invoiceType: "C" })).toBe("11 - Factura C");
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

// Nicolas, 14/11/2026: "estan todos los tipos ahora para seleccionar? los que propone la AFIP?".
describe("los tipos de comprobante que propone AFIP", () => {
  it("estan los que una SRL emite: A, B, C, M, E, recibos, notas y FCE MiPyME", () => {
    const codigos = COMPROBANTES_AFIP.map((c) => c.codigo);
    [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 15, 19, 20, 21, 51, 52, 53, 54, 201, 206, 211].forEach((c) =>
      expect(codigos).toContain(c)
    );
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(TIPOS_FACTURA_EMITIDA[0]).toBe("1 - Factura A");
    expect(TIPOS_FACTURA_EMITIDA).toContain("201 - Factura de Crédito Electrónico MiPyME A");
  });

  it("cada tipo de la lista sabe su codigo de AFIP", () => {
    COMPROBANTES_AFIP.forEach((c) =>
      expect(codigoAfipDeFactura({ invoiceType: nombre(c) })).toBe(c.codigo)
    );
  });

  it("el facturador del sistema emite solo factura A, B y C", () => {
    expect(puedeEmitirloElSistema({ invoiceType: "1 - Factura A" })).toBe(true);
    expect(puedeEmitirloElSistema({ invoiceType: "6 - Factura B" })).toBe(true);
    expect(puedeEmitirloElSistema({ invoiceType: "11 - Factura C" })).toBe(true);
    expect(puedeEmitirloElSistema({ invoiceType: "3 - Nota de Credito A" })).toBe(false);
    expect(puedeEmitirloElSistema({ invoiceType: "201 - Factura de Credito Electronico MiPyME A" })).toBe(false);
  });
});

// Nicolas, 14/11/2026: "son 2 trabajos que se facturaron juntos. el monto de los 2 sumados debe ser el
// monto de la factura".
describe("una factura repartida entre varios trabajos", () => {
  const parte = (id: number, donde: string, total: number, repartida = true): FacturaEmitidaRef => ({
    ...completa,
    id,
    origen: "trabajo",
    donde,
    total,
    repartida,
  });

  it("marcada como repartida ya no es un duplicado, y las partes suman el total del comprobante", () => {
    const todas = [parte(1, "el trabajo 3395", 2974474), parte(2, "el trabajo 3396", 2953593)];
    expect(esRepartida(todas[0], [todas[1]])).toBe(true);
    const r = repartoDeFactura(todas[0], todas)!;
    expect(r.partes).toHaveLength(2);
    expect(r.total).toBe(5928067);
    expect(textoReparto(r, (n) => String(n))).toBe(
      "Comprobante repartido en 2 trabajos: el trabajo 3395 2974474 + el trabajo 3396 2953593 = 5928067 (ese total es el que tiene que decir ARCA)"
    );
  });

  it("basta con que una de las partes este marcada", () => {
    const todas = [parte(1, "el trabajo 3395", 100, false), parte(2, "el trabajo 3396", 200, true)];
    expect(esRepartida(todas[0], [todas[1]])).toBe(true);
  });

  it("sin marcar, sigue siendo un duplicado", () => {
    const todas = [parte(1, "el trabajo 3395", 100, false), parte(2, "el trabajo 3396", 200, false)];
    expect(esRepartida(todas[0], [todas[1]])).toBe(false);
    expect(duplicadasDe(todas[0], todas)).toHaveLength(1);
  });

  it("una sola factura no es un reparto", () => {
    expect(repartoDeFactura(parte(1, "el trabajo 3395", 100), [parte(1, "el trabajo 3395", 100)])).toBeNull();
  });
});
