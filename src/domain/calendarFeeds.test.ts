import {
  pagoAlimentaCalendario,
  devolucionDeCajaChica,
  repartoDelFondo,
  modoDelBanco,
  movimientoBancarioAlimenta,
} from "./calendarFeeds";
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

// EL BANCO CORROBORA, NO CARGA. Mientras se pone el sistema al dia el extracto alimenta el calendario;
// desde el ejercicio siguiente la carga es manual y el banco solo verifica. Si esto se invierte mal,
// o se duplica cada peso o desaparece medio cash flow.
describe("modo del banco", () => {
  const CIERRE = "2026-10-31"; // fin del ejercicio de puesta al dia

  it("hasta el cierre del ejercicio, el banco carga", () => {
    expect(modoDelBanco("2026-08-26", CIERRE)).toBe("carga");
    expect(modoDelBanco("2026-10-31", CIERRE)).toBe("carga"); // el dia del cierre entra
    expect(movimientoBancarioAlimenta("2026-10-31", CIERRE)).toBe(true);
  });

  it("desde el 1 de noviembre, el banco solo corrobora", () => {
    expect(modoDelBanco("2026-11-01", CIERRE)).toBe("corrobora");
    expect(movimientoBancarioAlimenta("2026-11-01", CIERRE)).toBe(false);
  });

  it("sin fecha de corte configurada se comporta como antes (el banco carga)", () => {
    expect(modoDelBanco("2027-05-10", "")).toBe("carga");
    expect(movimientoBancarioAlimenta("2027-05-10", "")).toBe(true);
  });

  it("en modo CARGA manda el extracto: el pago por transferencia no se cuenta dos veces", () => {
    expect(pagoAlimentaCalendario({ paymentMethod: "transferencia" }, "2026-08-26", CIERRE)).toBe(false);
    expect(pagoAlimentaCalendario({ paymentMethod: "efectivo" }, "2026-08-26", CIERRE)).toBe(true);
  });

  it("en modo CORROBORA manda la carga manual: el pago suma aunque haya salido del banco", () => {
    expect(pagoAlimentaCalendario({ paymentMethod: "transferencia" }, "2026-11-05", CIERRE)).toBe(true);
    expect(pagoAlimentaCalendario({ paymentMethod: "efectivo" }, "2026-11-05", CIERRE)).toBe(true);
    // conciliado contra un debito: sigue sumando, porque el debito ya no suma por su cuenta
    expect(pagoAlimentaCalendario({ bankEntryId: 77 }, "2026-11-05", CIERRE)).toBe(true);
  });

  it("en modo CORROBORA, un gasto que ES el movimiento importado no se duplica", () => {
    expect(pagoAlimentaCalendario({ source: "extracto" }, "2026-11-05", CIERRE)).toBe(false);
  });

  it("cada peso una sola vez: en ninguno de los dos modos suman el pago Y el debito", () => {
    const pagoPorBanco = { paymentMethod: "transferencia", bankEntryId: 77 };
    [
      { fecha: "2026-08-26", modo: "carga" },
      { fecha: "2026-11-05", modo: "corrobora" },
    ].forEach(({ fecha }) => {
      const sumaElPago = pagoAlimentaCalendario(pagoPorBanco, fecha, CIERRE);
      const sumaElBanco = movimientoBancarioAlimenta(fecha, CIERRE);
      expect(sumaElPago && sumaElBanco).toBe(false);
      expect(sumaElPago || sumaElBanco).toBe(true); // y alguno de los dos SI suma
    });
  });
});
