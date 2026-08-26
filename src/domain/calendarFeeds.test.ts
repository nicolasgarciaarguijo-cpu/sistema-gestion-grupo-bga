import { pagoAlimentaCalendario, devolucionDeCajaChica, repartoDelFondo } from "./calendarFeeds";
import { monthlyBlackPay } from "./payroll";

// Si esta regla se equivoca, el cash flow miente en los dos sentidos: o falta plata que salio, o la
// misma plata se cuenta dos veces. Es lo mas delicado del circuito hacia el calendario.
describe("pagoAlimentaCalendario", () => {
  it("un pago en efectivo entra: no deja rastro en el banco", () => {
    expect(pagoAlimentaCalendario({ paymentMethod: "efectivo" })).toBe(true);
  });

  it("sin metodo cargado entra (se asume efectivo, la UI lo marca con la D)", () => {
    expect(pagoAlimentaCalendario({})).toBe(true);
    expect(pagoAlimentaCalendario({ paymentMethod: "" })).toBe(true);
  });

  it("los medios que pasan por la cuenta NO entran: ya vienen por el debito", () => {
    ["transferencia", "cheque", "debito"].forEach((m) =>
      expect(pagoAlimentaCalendario({ paymentMethod: m })).toBe(false)
    );
  });

  it("un gasto importado del extracto NO entra: ES un movimiento del banco", () => {
    expect(pagoAlimentaCalendario({ source: "extracto", paymentMethod: "efectivo" })).toBe(false);
  });

  it("un pago conciliado contra un debito NO entra, aunque diga efectivo", () => {
    expect(pagoAlimentaCalendario({ bankEntryId: 77, paymentMethod: "efectivo" })).toBe(false);
    // bankEntryId 0 no es una conciliacion real, pero null/undefined tampoco deben confundirse
    expect(pagoAlimentaCalendario({ bankEntryId: null, paymentMethod: "efectivo" })).toBe(true);
  });
});

describe("devolucionDeCajaChica", () => {
  it("lo que no se gasto vuelve a entrar", () => {
    expect(devolucionDeCajaChica(100000, 72500)).toBe(27500);
  });

  it("si se gasto todo, no vuelve nada", () => {
    expect(devolucionDeCajaChica(100000, 100000)).toBe(0);
  });

  it("un fondo sobre-rendido no devuelve plata (eso es un gasto de mas, no un vuelto)", () => {
    expect(devolucionDeCajaChica(100000, 130000)).toBe(0);
  });
});

describe("repartoDelFondo", () => {
  it("con desglose, respeta blanco y negro", () => {
    expect(repartoDelFondo({ assignedAmount: 100000, assignedWhite: 60000, assignedBlack: 40000 })).toEqual({
      blanco: 60000,
      negro: 40000,
    });
  });

  it("un fondo viejo sin desglose se toma entero como blanco", () => {
    expect(repartoDelFondo({ assignedAmount: 100000 })).toEqual({ blanco: 100000, negro: 0 });
  });

  it("un fondo 100% negro no deja nada en blanco", () => {
    expect(repartoDelFondo({ assignedAmount: 50000, assignedBlack: 50000 })).toEqual({
      blanco: 0,
      negro: 50000,
    });
  });
});

// Los haberes en negro son la parte de la nomina que no deja rastro en el extracto. El calendario los
// necesita para que Haberes no muestre solo la mitad de lo que cuesta la gente.
describe("monthlyBlackPay", () => {
  it("el premio en efectivo de un empleado de convenio", () => {
    expect(monthlyBlackPay({ cashBonus: 150000 })).toBe(150000);
  });

  it("el temporal cobra todo su acuerdo en negro", () => {
    expect(monthlyBlackPay({ isTemporal: true, agreedSalary: 800000 })).toBe(800000);
    // sin la marca de temporal, el acuerdo no cuenta
    expect(monthlyBlackPay({ agreedSalary: 800000 })).toBe(0);
  });

  it("el fuera de convenio solo suma su parte negra", () => {
    expect(monthlyBlackPay({ isFueraConvenio: true, agreedWhite: 900000, agreedBlack: 400000 } as any)).toBe(
      400000
    );
    expect(monthlyBlackPay({ agreedBlack: 400000 })).toBe(0);
  });

  it("sin nada en negro devuelve cero (no ensucia el calendario con filas vacias)", () => {
    expect(monthlyBlackPay({})).toBe(0);
  });
});
