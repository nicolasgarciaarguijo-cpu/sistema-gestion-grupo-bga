import { camposDeImpuesto, descripcionDeImpuesto, faltaEnImpuesto, GRUPO_IMPUESTOS_BANCO } from "./impuestoManual";
import { fichasDeExtracto, type MovimientoF, type PagoBancoF } from "./fichaExtracto";
import { fichaDelResumen, type PagoF, type RenglonF } from "./fichaTarjeta";

// Nicolas, 23/11/2026: los impuestos, tasas e intereses del banco se cargan a mano el dia que se cobran, para tener la
// cuenta al dia; el extracto o el resumen, cuando llegan, se linkean para corroborar y NO los vuelven a sumar.
describe("impuesto del banco cargado a mano", () => {
  it("el de la cuenta sale por debito y el de la tarjeta por la tarjeta, cada uno con su titulo", () => {
    const cuenta = camposDeImpuesto({ metodo: "debito", tipo: "Impuesto al débito / crédito", descripcion: " transferencia de Pérez " });
    expect(cuenta).toMatchObject({ group: GRUPO_IMPUESTOS_BANCO, paymentMethod: "debito", administration: "blanco", aCuenta: false, impuestoBanco: true, notes: "transferencia de Pérez" });
    expect(cuenta.description).toBe("Impuestos, tasas e intereses (cuenta) · Impuesto al débito / crédito · transferencia de Pérez");
    const tarjeta = camposDeImpuesto({ metodo: "tarjeta_credito", descripcion: "sellos del resumen" });
    expect(tarjeta.paymentMethod).toBe("tarjeta_credito");
    expect(tarjeta.description).toBe("Impuestos, tasas e intereses (tarjeta) · sellos del resumen");
    expect(tarjeta.impuestoTipo).toBeUndefined();
  });

  it("la descripcion es obligatoria", () => {
    expect(faltaEnImpuesto({ metodo: "debito", descripcion: "  " })).toBe("Falta la descripción");
    expect(faltaEnImpuesto({ metodo: "debito", descripcion: "comisión" })).toBeNull();
    expect(descripcionDeImpuesto({ metodo: "debito" })).toBe("Impuestos, tasas e intereses (cuenta)");
  });
});

describe("el extracto sugiere el impuesto ya cargado", () => {
  const mov = (id: number, date: string, amount: number, concept: string, balance: number): MovimientoF => ({ id, company: "BGA", bank: "Santander", currency: "ARS", date, concept, movementType: "debito", amount, balance });
  const movs = [mov(1, "2026-11-16", 97704.65, "IMPUESTO LEY 25.413 CREDITO 0,6%", 1000), mov(2, "2026-11-16", 500, "IMPUESTO LEY 25.413 DEBITO 0,6%", 500)];
  const pago = (extra: Partial<PagoBancoF> = {}): PagoBancoF => ({ id: 10, company: "BGA", date: "2026-11-16", amount: 97704.65, supplier: "Banco Santander", description: "Impuestos, tasas e intereses (cuenta) · transferencia", paymentMethod: "debito", impuestoBanco: true, cuentaId: "banco|BGA|santander|ARS", ...extra });

  it("el cargo con impuesto cargado queda SUGERIDO y no suma a comisiones; el otro sigue yendo a comisiones", () => {
    const [f] = fichasDeExtracto(movs, [pago()], []);
    const a = f.movimientos.find((x) => x.mov.id === 1)!;
    expect(a.estado).toBe("sugerido");
    expect(a.sugerencia).toMatchObject({ tipo: "pago", pagoId: 10 });
    expect(f.movimientos.find((x) => x.mov.id === 2)!.estado).toBe("comision");
    expect(f.comisionesArs).toBe(500);
  });

  it("ya linkeado: queda linkeado y el cargo no se suma dos veces", () => {
    const [f] = fichasDeExtracto(movs, [pago({ bankEntryId: 1 })], []);
    expect(f.movimientos.find((x) => x.mov.id === 1)!.estado).toBe("linkeado");
    expect(f.comisionesArs).toBe(500);
  });

  it("no sugiere el de otro banco, el de otra fecha lejana ni un pago que no es impuesto", () => {
    const estado = (p: PagoBancoF) => fichasDeExtracto(movs, [p], [])[0].movimientos.find((x) => x.mov.id === 1)!.estado;
    expect(estado(pago({ cuentaId: "banco|BGA|patagonia|ARS" }))).toBe("comision");
    expect(estado(pago({ date: "2026-11-02" }))).toBe("comision");
    expect(estado(pago({ impuestoBanco: false }))).toBe("comision");
  });

  it("sirve con un extracto parcial: lo cargado despues del ultimo movimiento subido no molesta", () => {
    const [f] = fichasDeExtracto([movs[0]], [pago(), pago({ id: 11, date: "2026-11-20", amount: 300 })], []);
    expect(f.movimientos).toHaveLength(1);
    expect(f.movimientos[0].estado).toBe("sugerido");
  });
});

describe("el resumen de la tarjeta sugiere el impuesto ya cargado", () => {
  const resumen = { id: 1, company: "DR", cardId: 5, closingDate: "2026-11-20", dueDate: "2026-12-05" } as any;
  const tarjetas = [{ id: 5, company: "DR", name: "Visa", bank: "Patagonia" }] as any;
  const renglon = (id: number, description: string, amount: number, extra: Partial<RenglonF> = {}): RenglonF => ({ id, company: "DR", cardId: 5, statementId: 1, date: "2026-11-20", description, amount, currency: "ARS", ...extra });
  const renglones = [renglon(1, "COMPRA FERRETERIA", 1000, { cardDigits: "1234" }), renglon(2, "IMPUESTO DE SELLOS", 33311), renglon(3, "IVA 21%", 216.81)];
  const impuesto: PagoF = { id: 20, company: "DR", tarjetaId: 5, date: "2026-11-18", amount: 33311, cuotas: 1, supplier: "Banco Patagonia", description: "Impuestos, tasas e intereses (tarjeta) · sellos", impuestoBanco: true };

  it("el cargo ya cargado se sugiere; el resto sigue en comisiones", () => {
    const f = fichaDelResumen(resumen, renglones, [impuesto], tarjetas, [resumen]);
    const sellos = f.renglones.find((x) => x.renglon.id === 2)!;
    expect(sellos.estado).toBe("sugerido");
    expect(sellos.sugerencia).toMatchObject({ pagoId: 20, cuota: 1 });
    expect(f.comisionesArs).toBe(216.81);
  });

  it("linkeado no suma a comisiones; mandado a comisiones a mano descarta la sugerencia", () => {
    const linkeado = fichaDelResumen(resumen, renglones.map((r) => (r.id === 2 ? { ...r, pagoId: 20, cuotaNro: 1 } : r)), [impuesto], tarjetas, [resumen]);
    expect(linkeado.renglones.find((x) => x.renglon.id === 2)!.estado).toBe("linkeado");
    expect(linkeado.comisionesArs).toBe(216.81);
    const aMano = fichaDelResumen(resumen, renglones.map((r) => (r.id === 2 ? { ...r, aComisiones: true } : r)), [impuesto], tarjetas, [resumen]);
    expect(aMano.renglones.find((x) => x.renglon.id === 2)!.estado).toBe("comision");
    expect(aMano.comisionesArs).toBe(33527.81);
  });

  it("un impuesto cargado nunca se sugiere para una compra del mismo monto", () => {
    const f = fichaDelResumen(resumen, [renglon(1, "COMPRA", 33311, { cardDigits: "1234" })], [impuesto], tarjetas, [resumen]);
    expect(f.renglones[0].estado).toBe("pendiente");
  });
});

// Nicolas, 23/11/2026: "coloquemos una opcion que sea conciliacion a fin de mes [...] de esa forma no figura una falta
// de factura pero si sirve para saber si falta el resumen".
describe("conciliacion a fin de mes", () => {
  const { esperanConciliacion } = require("./impuestoManual");
  const pagos = [
    { id: 1, amount: 100, conciliaFinDeMes: true, paymentMethod: "debito" },
    { id: 2, amount: 200, conciliaFinDeMes: true, paymentMethod: "debito", bankEntryId: 9 },
    { id: 3, amount: 300, conciliaFinDeMes: true, paymentMethod: "tarjeta_credito" },
    { id: 4, amount: 400, conciliaFinDeMes: true, paymentMethod: "tarjeta_credito" },
    { id: 5, amount: 500, paymentMethod: "transferencia" },
  ];
  it("esperan los de la cuenta sin linkear al extracto y los de la tarjeta sin renglon del resumen", () => {
    expect(esperanConciliacion(pagos, new Set([4])).map((p: any) => p.id)).toEqual([1, 3]);
  });
  it("un impuesto del banco cargado a mano tambien espera su extracto", () => {
    expect(camposDeImpuesto({ metodo: "debito", descripcion: "x" }).conciliaFinDeMes).toBe(true);
  });
});

// Nicolas, 23/11/2026: "constatacion contra VEP: que aparezca esa modalidad y que aclare si el VEP no esta cargado".
describe("constatacion contra VEP", () => {
  const { faltaElVep } = require("./impuestoManual");
  it("avisa los pagos marcados que no tienen el VEP vinculado ni una resolucion", () => {
    const pagos = [
      { id: 1, amount: 390297.89, esperaVep: true },
      { id: 2, amount: 100, esperaVep: true },
      { id: 3, amount: 50, esperaVep: true, resolucionSinFactura: { tipo: "responsable" } },
      { id: 4, amount: 70 },
    ];
    expect(faltaElVep(pagos, new Set([2])).map((p: any) => p.id)).toEqual([1]);
  });
});
