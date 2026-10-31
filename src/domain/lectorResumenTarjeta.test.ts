import { leerResumenTarjeta, fechaCorta, importeAr } from "./lectorResumenTarjeta";

// Lineas como las arma lib/pdfLineas.ts del PDF real de Visa Business Patagonia (cierre 01/10/26).
const PATAGONIA = `VISA BUSINESS  PAGINA:  1/ 2
N DE CUENTA:  1108711683
TITULAR DE CUENTA:  BGA ESTUDIO DE DISE#O
BGA ESTUDIO DE DISE#O  CIERRE ACTUAL: 01 Oct 26
S. DE LA INDEPENDENCIA  1248 14  VENCIMIENTO  SALDO $  SALDO U$S PAGO MIN.$ PAGO MIN.U$S
1642 PROV BS AIRES  13 Oct 26 390.212,42  0,00  40.000,00  -,--
FECHA COMPROBANTE  DETALLE DE TRANSACCION  PESOS  DOLARES
SALDO ANTERIOR  237.159,17  0,00
07.09.26  SU PAGO EN PESOS  237.159,17-  _
31.08.26  002199*  EPAGOS *VTV _ APPLUS  96.968,19
01.09.26  000001K  AUTOPISTAS URBAN 000000000842445  8.837,23
06.09.26  000001K  CAMINO PQUE B AY 908030715274686  59.040,40
08.09.26  000001K  AUTOPISTAS DEL S 803071527468601  35.046,79
20.09.26  000001K  AUTOPISTAS URBAN 000000000842445  3.611,56
22.09.26  000001K  CAMINO PQUE B AY 908030715274686  43.053,62
24.09.26  000001K  AUTOPISTAS DEL S 803071527468601  8.150,39
01.10.26  000001K  CORRESUR  000000370757416  4.646,46
01.10.26  000001K  TELEPEAJE PLUS  000000370757416  55,76
Tarjeta 5279 Total Consumos de GUSTAVO O GARCIA A  259.410,40  0,00 _
25.09.26  060000*  LA SEGUNDA COO8884558-05/06-000-045  126.175,00
Tarjeta 7048 Total Consumos de MARI GARCIA ARGUIJO  126.175,00  0,00 _
01.10.26  IMPUESTO DE SELLOS  $  4.627,02
__________________________________________________________
SALDO ACTUAL  $  390.212,42`.split("\n");

const SANTANDER = `RESUMEN DE CUENTA
Santander Río
VISA
Grupo:  SR PYMES PAQ  02  731380554  N987  105715  01/07
Cuenta:  AT: GUSTAVO OCTAVIO GAR  UIT 30-71527468-6
BGA ESTUDIO DE DISE
1606 CARAPACHAY  CIERRE  20 Ago 26 VENCIMIENTO 01 Set 26
Fecha  Comprobante Referencia  $  U$S
SALDO ANTERIOR  100.000,00  10,00
26 Agosto  03  SU PAGO EN PESOS  115.000,00 TC1500,000  100.000,00-  10,00-
26 Julio  24 035947 *  PERSONAL  100355354011001  1.000,00
Tarjeta 2568 Total Consumos de ARGUIJO GUST GARCIA  1.000,00 *  0,00 *
26 Marzo  16 725241 *  MERPAGO*FEMARMAQUINAS  C.06/12  512.211,00
26 Julio  23 269521 F  FACEBK *UYJKFXDWV2  USD  47,34  47,34
Tarjeta 4239 Total Consumos de ARGUIJO NICO GARCIA  512.211,00 *  47,34 *
26 Agosto  20  IMPUESTO DE SELLOS  $  1.000,00
20  IIBB PERCEP-BSAS 2,00%(  140897,64)  2.817,95
SALDO ACTUAL  $  U$S
PAGO MINIMO  $
TNA  78,000 TEM  6,411 TNA  12,000 TEM  0,986  SALDO ACTUAL  $517.028,95  U$S  47,34
PAGO MINIMO  $  200.000,00`.split("\n");

describe("lector de resumenes de tarjeta", () => {
  it("fechas e importes argentinos", () => {
    expect(fechaCorta("01 Set 26")).toBe("2026-09-01");
    expect(fechaCorta("29 Ene 26")).toBe("2026-01-29");
    expect(importeAr("1.234,56")).toBe(1234.56);
    expect(importeAr("41.509,46-")).toBe(-41509.46);
    expect(importeAr("1352.078,11")).toBe(1352078.11);
  });

  it("Patagonia: cabecera, tarjetas fisicas con su responsable y cierra al centavo", () => {
    const r = leerResumenTarjeta(PATAGONIA)!;
    expect(r.banco).toBe("Patagonia");
    expect(r.producto).toBe("Visa Business");
    expect(r.numeroCuenta).toBe("1108711683");
    expect(r.closingDate).toBe("2026-10-01");
    expect(r.dueDate).toBe("2026-10-13");
    expect(r.totalArs).toBe(390212.42);
    expect(r.minPaymentArs).toBe(40000);
    expect(r.diferenciaArs).toBe(0);
    expect(r.tarjetas.map((t) => `${t.digits}:${t.holder}`)).toEqual(["5279:GUSTAVO O GARCIA A", "7048:MARI GARCIA ARGUIJO"]);
    const segunda = r.renglones.find((x) => x.description.startsWith("LA SEGUNDA"))!;
    expect(segunda.cardDigits).toBe("7048");
    expect(segunda.tipo).toBe("consumo");
    const sellos = r.renglones.find((x) => x.description.startsWith("IMPUESTO DE SELLOS"))!;
    expect(sellos.tipo).toBe("cargo");
    expect(sellos.cardDigits).toBe("");
    expect(r.renglones.find((x) => x.tipo === "pago")!.amount).toBe(-237159.17);
  });

  it("Santander: meses con nombre, cuotas C.06/12, dolares, base de percepciones y saldo de la ultima hoja", () => {
    const r = leerResumenTarjeta(SANTANDER)!;
    expect(r.banco).toBe("Santander");
    expect(r.numeroCuenta).toBe("731380554");
    expect(r.cuitTitular).toBe("30715274686");
    expect(r.closingDate).toBe("2026-08-20");
    expect(r.dueDate).toBe("2026-09-01");
    expect(r.totalArs).toBe(517028.95);
    expect(r.totalUsd).toBe(47.34);
    expect(r.minPaymentArs).toBe(200000);
    const cuota = r.renglones.find((x) => x.description.includes("FEMARMAQUINAS"))!;
    expect(cuota.installments).toBe("06/12");
    expect(cuota.date).toBe("2026-03-16");
    expect(cuota.cardDigits).toBe("4239");
    const usd = r.renglones.find((x) => x.description.includes("FACEBK"))!;
    expect(usd.currency).toBe("USD");
    expect(usd.amount).toBe(47.34);
    const iibb = r.renglones.find((x) => x.description.startsWith("IIBB"))!;
    expect(iibb.amount).toBe(2817.95);
    expect(iibb.tipo).toBe("cargo");
    expect(r.diferenciaArs).toBe(0);
    expect(r.diferenciaUsd).toBe(0);
  });

  it("Santander: meses abreviados con punto, el millon con cuatro cifras y las hojas legales no se leen", () => {
    const r = leerResumenTarjeta(
      `Santander Río
Grupo:  SR PYMES PAQ  02  731380554  N987  107532  01/05
1606 CARAPACHAY  CIERRE  24 Dic 25 VENCIMIENTO 05 Ene 26
Fecha  Comprobante Referencia  $  U$S
SALDO ANTERIOR  1251.672,24  0,00
25 Diciem. 01  SU PAGO EN PESOS  1251.672,24-
25 Noviem. 24 361648 *  YPF FARMEX  128.731,00
Tarjeta 4239 Total Consumos de ARGUIJO NICO GARCIA  128.731,00 *  0,00 *
El banco podrá modificar los límites establecidos en el presente a su
Fecha  Comprobante Referencia  $  U$S
05 Mantenimiento de cuenta de 1 a 9 tarjetas Precio sin IVA $26.339,28
TNA  81,800 TEM  6,723 TNA  12,000 TEM  0,986  SALDO ACTUAL  $128.731,00  U$S  0,00`.split("\n")
    )!;
    expect(r.saldoAnteriorArs).toBe(1251672.24);
    expect(r.renglones.map((x) => x.date)).toEqual(["2025-12-01", "2025-11-24"]);
    expect(r.diferenciaArs).toBe(0);
  });

  it("un PDF que no es resumen de tarjeta no se lee", () => {
    expect(leerResumenTarjeta(["Resumen de cuenta", "Cuenta Corriente"])).toBeNull();
  });
});
