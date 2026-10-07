import {
  armarCuentas,
  controlContraExtracto,
  cuentaPorDefecto,
  idCajaPersona,
  idCuentaBanco,
  idCuentaEfectivo,
  movimientosPorCuenta,
  saldosDeCuentas,
  saldosDiarios,
  type PlataMovida,
} from "./cuentas";

const CORTE = "2026-08-29";
const cuentas = armarCuentas({
  companies: ["BGA"],
  guardadas: [],
  fechaCorte: CORTE,
  bancosExtracto: [
    { company: "BGA", bank: "Santander", currency: "ARS", balance: 1000000 },
    { company: "BGA", bank: "Patagonia", currency: "ARS", balance: 200000 },
  ],
  efectivoApertura: [{ company: "BGA", color: "negro", moneda: "ARS", saldo: 50000 }],
  personas: [{ company: "BGA", persona: "Gustavo", color: "negro" }],
});
const mov = (over: Partial<PlataMovida>): PlataMovida => ({
  refId: "x",
  origen: "test",
  detalle: "",
  company: "BGA",
  date: "2026-09-10",
  amount: 100,
  sentido: "sale",
  moneda: "ARS",
  color: "blanco",
  ...over,
});
const saldo = (id: string, plata: PlataMovida[], hasta?: string) =>
  saldosDeCuentas(cuentas, movimientosPorCuenta(plata, cuentas), hasta).find((c) => c.id === id)!.saldo;

describe("armarCuentas", () => {
  it("una cuenta por banco del extracto (con su saldo a la fecha de corte), efectivo B/N en $ y U$S y la caja de cada persona", () => {
    expect(cuentas.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        idCuentaBanco("BGA", "Santander", "ARS"),
        idCuentaBanco("BGA", "Patagonia", "ARS"),
        idCuentaEfectivo("BGA", "blanco", "ARS"),
        idCuentaEfectivo("BGA", "negro", "USD"),
        idCajaPersona("BGA", "Gustavo", "negro"),
      ])
    );
    expect(cuentas.find((c) => c.id === idCuentaBanco("BGA", "Santander", "ARS"))?.saldoApertura).toBe(1000000);
  });
  it("lo guardado le gana a lo deducido", () => {
    const id = idCuentaBanco("BGA", "Santander", "ARS");
    const c = armarCuentas({
      companies: ["BGA"],
      guardadas: [{ ...cuentas.find((x) => x.id === id)!, saldoApertura: 5, principal: true }],
      fechaCorte: CORTE,
      bancosExtracto: [{ company: "BGA", bank: "Santander", currency: "ARS", balance: 1000000 }],
      efectivoApertura: [],
      personas: [],
    });
    expect(c.find((x) => x.id === id)).toMatchObject({ saldoApertura: 5, principal: true });
  });
});

describe("cuentaPorDefecto", () => {
  it("efectivo o negro -> efectivo de su color; si no, el banco principal", () => {
    expect(cuentaPorDefecto(cuentas, { company: "BGA", moneda: "ARS", color: "blanco", metodo: "efectivo" })).toBe(idCuentaEfectivo("BGA", "blanco", "ARS"));
    expect(cuentaPorDefecto(cuentas, { company: "BGA", moneda: "ARS", color: "negro", metodo: "transferencia" })).toBe(idCuentaEfectivo("BGA", "negro", "ARS"));
    // sin principal marcado: la primera por nombre (Patagonia antes que Santander)
    expect(cuentaPorDefecto(cuentas, { company: "BGA", moneda: "ARS", color: "blanco", metodo: "transferencia" })).toBe(idCuentaBanco("BGA", "Patagonia", "ARS"));
  });
  it("sin banco en esa moneda, va al efectivo", () => {
    expect(cuentaPorDefecto(cuentas, { company: "BGA", moneda: "USD", color: "blanco", metodo: "transferencia" })).toBe(idCuentaEfectivo("BGA", "blanco", "USD"));
  });
});

describe("saldos", () => {
  const santander = idCuentaBanco("BGA", "Santander", "ARS");
  it("lo cargado mueve la cuenta elegida: cobro entra, pago sale", () => {
    const plata = [
      mov({ sentido: "entra", amount: 300000, cuentaId: santander }),
      mov({ sentido: "sale", amount: 100000, cuentaId: santander }),
    ];
    expect(saldo(santander, plata)).toBe(1200000);
  });
  it("los movimientos hasta la fecha de apertura no cuentan (ya estan en el saldo de apertura)", () => {
    expect(saldo(santander, [mov({ date: "2026-08-20", amount: 999, cuentaId: santander })])).toBe(1000000);
  });
  it("un pase saca de una cuenta y pone en la otra (ej. caja chica a Gustavo)", () => {
    const plata = [mov({ sentido: "pase", color: "negro", amount: 20000, personaDestino: "Gustavo" })];
    expect(saldo(idCuentaEfectivo("BGA", "negro", "ARS"), plata)).toBe(30000);
    expect(saldo(idCajaPersona("BGA", "Gustavo", "negro"), plata)).toBe(20000);
  });
  it("el gasto de la caja de una persona sale de su caja", () => {
    const plata = [
      mov({ sentido: "pase", color: "negro", amount: 20000, personaDestino: "Gustavo" }),
      mov({ sentido: "sale", color: "negro", amount: 5000, persona: "Gustavo" }),
    ];
    expect(saldo(idCajaPersona("BGA", "Gustavo", "negro"), plata)).toBe(15000);
  });
  it("una cuenta elegida que no existe cae en la por defecto", () => {
    expect(saldo(idCuentaEfectivo("BGA", "blanco", "ARS"), [mov({ sentido: "entra", metodo: "efectivo", cuentaId: "no-existe" })])).toBe(100);
  });
  it("saldo dia por dia", () => {
    const d = saldosDiarios(cuentas, movimientosPorCuenta([mov({ date: "2026-09-02", sentido: "entra", cuentaId: santander })], cuentas), ["2026-09-01", "2026-09-02"]);
    expect(d.get("2026-09-01")!.get(santander)).toBe(1000000);
    expect(d.get("2026-09-02")!.get(santander)).toBe(1000100);
  });
});

describe("control contra el extracto", () => {
  const santander = idCuentaBanco("BGA", "Santander", "ARS");
  it("cierra cuando el saldo del resumen coincide con el del sistema; si no, marca la diferencia", () => {
    const movs = movimientosPorCuenta([mov({ sentido: "sale", amount: 100000, cuentaId: santander })], cuentas);
    const ok = controlContraExtracto(cuentas, movs, [{ company: "BGA", bank: "Santander", currency: "ARS", date: "2026-09-30", balance: 900000 }]);
    expect(ok[0]).toMatchObject({ cierra: true, diferencia: 0 });
    const mal = controlContraExtracto(cuentas, movs, [{ company: "BGA", bank: "Santander", currency: "ARS", date: "2026-09-30", balance: 870000 }]);
    expect(mal[0]).toMatchObject({ cierra: false, diferencia: -30000, saldoSistema: 900000 });
  });
});
