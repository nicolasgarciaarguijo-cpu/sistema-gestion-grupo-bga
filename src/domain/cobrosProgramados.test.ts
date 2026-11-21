import { cobrosAResolver, cobrosConFechaMala, cobrosParaAvisar, cobrosProgramados, conFuturosComoEstimados, fechaIsoValida, fechaParaConfirmar, fechaParaReprogramar, puedeSerRealizado, type TrabajoConCobros } from "./cobrosProgramados";
import { armarCuentas, idCuentaBanco, movimientosPorCuenta, saldosDeCuentas, type PlataMovida } from "./cuentas";

// Nicolas, 21/11/2026: "cuando programamos un cobro debe avisar el sistema que ese cobro estaria por entrar,
// para pedir un ajuste de fechas o si no confirmar que el cobro se realizo. No deberia dispararse solo."
const HOY = "2026-11-21";
const trabajo = (extra: Partial<TrabajoConCobros> = {}): TrabajoConCobros => ({ id: 1, company: "BGA", budgetNumber: "3395", client: "Contract Rent SA", payments: [], cobrosPrevistos: [], ...extra });

describe("fechaIsoValida", () => {
  it("acepta una fecha de verdad y rechaza las que estaban en la base", () => {
    expect(fechaIsoValida("2026-11-06")).toBe(true);
    expect(fechaIsoValida("")).toBe(false);
    expect(fechaIsoValida(undefined)).toBe(false);
    // Las dos del 21/11: el campo de fecha deja escribir cualquier año.
    expect(fechaIsoValida("0026-08-04")).toBe(false);
    expect(fechaIsoValida("22026-08-13")).toBe(false);
    expect(fechaIsoValida("2026-02-30")).toBe(false);
    expect(fechaIsoValida("2026-13-01")).toBe(false);
    expect(fechaIsoValida("06/11/2026")).toBe(false);
  });
});

describe("cobros programados", () => {
  // Los tres reales de Contract Rent que estaban vencidos sin confirmar.
  const previstos = [
    trabajo({ id: 1, budgetNumber: "3394", cobrosPrevistos: [{ id: 11, paymentDate: "2026-11-13", amount: 2102563, estado: "estimado" }] }),
    trabajo({ id: 2, budgetNumber: "3395", cobrosPrevistos: [{ id: 12, paymentDate: "2026-11-06", amount: 2974474, estado: "estimado" }] }),
    trabajo({ id: 3, budgetNumber: "3396", cobrosPrevistos: [{ id: 13, paymentDate: "2026-11-06", amount: 2953593, estado: "estimado" }] }),
  ];

  it("el cobro con la fecha pasada queda vencido y exige resolverse; primero el mas viejo", () => {
    const r = cobrosProgramados(previstos, HOY);
    expect(r.map((c) => [c.budgetNumber, c.situacion, c.diasRestantes])).toEqual([["3395", "vencido", -15], ["3396", "vencido", -15], ["3394", "vencido", -8]]);
    expect(r[0].texto).toBe("Debía entrar hace 15 días");
    expect(cobrosAResolver(r)).toHaveLength(3);
    expect(cobrosAResolver(r).reduce((a, c) => a + c.monto, 0)).toBe(8030630);
  });

  it("avisa unos dias antes, y el dia que entra", () => {
    const j = trabajo({ cobrosPrevistos: [
      { id: 1, paymentDate: "2026-11-21", amount: 100, estado: "inamovible" },
      { id: 2, paymentDate: "2026-11-24", amount: 200, estado: "estimado" },
      { id: 3, paymentDate: "2026-11-26", amount: 300, estado: "estimado" },
      { id: 4, paymentDate: "2026-12-20", amount: 400, estado: "estimado" },
    ] });
    const r = cobrosProgramados([j], HOY);
    expect(r.map((c) => [c.paymentId, c.situacion, c.texto])).toEqual([
      [1, "hoy", "Entra hoy"],
      [2, "proximo", "Entra en 3 días"],
      [3, "proximo", "Entra en 5 días"],
      [4, "futuro", "Entra en 29 días"],
    ]);
    expect(cobrosParaAvisar(r).map((c) => c.paymentId)).toEqual([1, 2, 3]);
    expect(cobrosAResolver(r).map((c) => c.paymentId)).toEqual([1]);
    expect(r[0].estado).toBe("inamovible");
  });

  it("un cobro programado sin fecha (o con la fecha rota) tambien se avisa: no dice cuando entra", () => {
    const r = cobrosProgramados([trabajo({ cobrosPrevistos: [{ id: 1, paymentDate: "", amount: 100 }, { id: 2, paymentDate: "22026-08-13", amount: 50 }] })], HOY);
    expect(r.map((c) => [c.situacion, c.fecha, c.alerta])).toEqual([["sin_fecha", "", true], ["sin_fecha", "", true]]);
  });

  it("los cobros ya realizados y los que estan en cero no son programados", () => {
    const j = trabajo({ payments: [{ id: 9, paymentDate: "2026-11-01", amount: 500 }], cobrosPrevistos: [{ id: 1, paymentDate: "2026-11-06", amount: 0 }] });
    expect(cobrosProgramados([j], HOY)).toEqual([]);
  });

  it("guarda la moneda y el circuito", () => {
    const r = cobrosProgramados([trabajo({ cobrosPrevistos: [{ id: 1, paymentDate: "2026-11-25", amount: 100, currency: "USD", administration: "negro" }] })], HOY);
    expect(r[0]).toMatchObject({ moneda: "USD", administration: "negro" });
  });
});

describe("cobros realizados con la fecha mal", () => {
  it("encuentra los vacios, los mal tipeados y los que figuran cobrados en el futuro", () => {
    const r = cobrosConFechaMala(
      [
        trabajo({ id: 1, budgetNumber: "3199", payments: [{ id: 1, paymentDate: "", amount: 5322485 }] }),
        trabajo({ id: 2, budgetNumber: "3413", payments: [{ id: 2, paymentDate: "0026-08-04", amount: 707886 }] }),
        trabajo({ id: 3, budgetNumber: "3415", payments: [{ id: 3, paymentDate: "22026-08-13", amount: 4308434 }] }),
        trabajo({ id: 4, budgetNumber: "CANDE", payments: [{ id: 4, paymentDate: "2026-12-26", amount: 5456284 }, { id: 5, paymentDate: "2026-11-16", amount: 100 }] }),
      ],
      HOY
    );
    expect(r.map((c) => [c.budgetNumber, c.motivo])).toEqual([["CANDE", "futura"], ["3199", "vacia"], ["3415", "invalida"], ["3413", "invalida"]]);
    expect(r[0].texto).toContain("fecha futura (26/12/2026)");
    expect(r[2].texto).toBe("fecha mal tipeada (22026-08-13)");
  });
});

describe("confirmar o cambiar la fecha", () => {
  it("confirmar pide la fecha real, y no puede ser futura", () => {
    expect(fechaParaConfirmar("2026-11-20", HOY).ok).toBe(true);
    expect(fechaParaConfirmar(HOY, HOY).ok).toBe(true);
    expect(fechaParaConfirmar("2026-11-25", HOY)).toMatchObject({ ok: false });
    expect(fechaParaConfirmar("", HOY).ok).toBe(false);
    expect(fechaParaConfirmar("22026-08-13", HOY).ok).toBe(false);
  });
  it("cambiar la fecha pide una de hoy en adelante", () => {
    expect(fechaParaReprogramar("2026-12-05", HOY).ok).toBe(true);
    expect(fechaParaReprogramar(HOY, HOY).ok).toBe(true);
    expect(fechaParaReprogramar("2026-11-10", HOY).ok).toBe(false);
    expect(fechaParaReprogramar("0026-12-05", HOY).ok).toBe(false);
  });
});

// "La plata del cobro sin año no deberia haberse quitado del banco": nunca tendria que haber entrado. Un
// movimiento con la fecha rota no se puede ubicar en el tiempo, asi que no mueve ninguna cuenta.
describe("un movimiento con la fecha rota no mueve ninguna cuenta", () => {
  const cuentas = armarCuentas({ companies: ["BGA"], guardadas: [], fechaCorte: "2026-08-29", bancosExtracto: [{ company: "BGA", bank: "Santander", currency: "ARS", balance: 1000000 }], efectivoApertura: [], personas: [] } as any);
  const santander = idCuentaBanco("BGA", "Santander", "ARS");
  const cobro = (date: string): PlataMovida => ({ refId: "cobro-1", origen: "Cobro de trabajo", detalle: "", company: "BGA", date, amount: 500000, sentido: "entra", moneda: "ARS", color: "blanco", cuentaId: santander } as PlataMovida);
  const saldo = (date: string, hasta?: string) => saldosDeCuentas(cuentas, movimientosPorCuenta([cobro(date)], cuentas), hasta).find((c) => c.id === santander)!.saldo;

  it("con la fecha bien, el cobro suma", () => {
    expect(saldo("2026-11-10", HOY)).toBe(1500000);
  });
  it("con el año de 5 cifras no suma nunca, ni siquiera sin tope de fecha", () => {
    expect(saldo("22026-08-13", HOY)).toBe(1000000);
    expect(saldo("22026-08-13")).toBe(1000000);
  });
  it("con el año 0026 o sin fecha tampoco", () => {
    expect(saldo("0026-08-04")).toBe(1000000);
    expect(saldo("")).toBe(1000000);
  });
});

// Nicolas, 21/11/2026: "un cobro con fecha futura es estimado. Hasta no garantizar el pago no cuenta como
// plata. Incluso si es un cheque o un echeq o una transferencia programada. Manualmente se debe avisar que se cobro."
describe("un cobro con fecha futura es estimado", () => {
  it("el realizado con fecha futura pasa a los previstos como estimado, conservando sus datos", () => {
    const j = conFuturosComoEstimados(
      trabajo({ payments: [{ id: 1, paymentDate: "2026-12-26", amount: 5456284, cuentaId: "banco|BGA|santander|ARS" }, { id: 2, paymentDate: "2026-11-16", amount: 100 }], cobrosPrevistos: [{ id: 9, paymentDate: "2026-12-01", amount: 50, estado: "inamovible" }] }),
      HOY
    );
    expect(j.payments!.map((p) => p.id)).toEqual([2]);
    expect(j.cobrosPrevistos!.map((p) => [p.id, p.estado])).toEqual([[1, "estimado"], [9, "inamovible"]]);
    expect(j.cobrosPrevistos![0].cuentaId).toBe("banco|BGA|santander|ARS");
  });

  it("los de hoy y los pasados quedan realizados; sin futuros devuelve el mismo trabajo", () => {
    const original = trabajo({ payments: [{ id: 1, paymentDate: HOY, amount: 100 }, { id: 2, paymentDate: "2026-11-01", amount: 100 }] });
    expect(conFuturosComoEstimados(original, HOY)).toBe(original);
  });

  it("una fecha rota no es futura: no se mueve sola (se avisa para corregirla)", () => {
    const original = trabajo({ payments: [{ id: 1, paymentDate: "22026-08-13", amount: 100 }, { id: 2, paymentDate: "", amount: 100 }] });
    expect(conFuturosComoEstimados(original, HOY)).toBe(original);
  });

  it("despues de acomodarlo deja de figurar como cobrado y pasa a avisarse como programado", () => {
    const j = conFuturosComoEstimados(trabajo({ payments: [{ id: 1, paymentDate: "2026-11-24", amount: 100 }] }), HOY);
    expect(cobrosConFechaMala([j], HOY)).toEqual([]);
    expect(cobrosProgramados([j], HOY).map((c) => [c.situacion, c.estado])).toEqual([["proximo", "estimado"]]);
  });

  it("no se puede marcar realizado lo que todavia no entro", () => {
    expect(puedeSerRealizado("2026-12-26", HOY)).toBe(false);
    expect(puedeSerRealizado(HOY, HOY)).toBe(true);
    expect(puedeSerRealizado("2026-11-01", HOY)).toBe(true);
    // Sin fecha (o rota) no se traba el cambio de estado: se corrige la fecha despues.
    expect(puedeSerRealizado("", HOY)).toBe(true);
  });
});
