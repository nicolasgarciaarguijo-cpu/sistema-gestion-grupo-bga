import { cambiaDeMoneda, faltantesDelPase, monedaDestinoDelPase, montoDestinoDelPase, type PaseForm } from "./pases";
import { armarCuentas, idCuentaBanco, movimientosPorCuenta, saldosDeCuentas, type PlataMovida } from "./cuentas";
import { agendaInamovibles, type FuentesInamovibles } from "./agendaInamovibles";

// Nicolas, 14/11/2026: "tambien para hacer traspasos de USD a pesos en la situacion que sea necesario,
// todo eso debe quedar asentado" + "en desendeudamientos debemos tener una administracion en USD".
const base: PaseForm = {
  date: "2026-11-14",
  amount: 1000,
  currency: "USD",
  company: "BGA",
  cuentaId: "banco|BGA|dolares|USD",
  companyDestino: "BGA",
  cuentaDestinoId: "banco|BGA|santander|ARS",
  description: "Venta de dólares",
  notes: "",
};

describe("traspaso entre monedas", () => {
  it("de dólares a pesos multiplica por la cotización", () => {
    const f = { ...base, currencyDestino: "ARS" as const, cotizacion: 1450 };
    expect(cambiaDeMoneda(f)).toBe(true);
    expect(monedaDestinoDelPase(f)).toBe("ARS");
    expect(montoDestinoDelPase(f)).toBe(1450000);
  });

  it("de pesos a dólares divide por la cotización", () => {
    const f = { ...base, amount: 1450000, currency: "ARS" as const, currencyDestino: "USD" as const, cotizacion: 1450 };
    expect(montoDestinoDelPase(f)).toBe(1000);
  });

  it("en la misma moneda entra lo mismo que sale, sin cotización", () => {
    const f = { ...base, currencyDestino: "USD" as const };
    expect(cambiaDeMoneda(f)).toBe(false);
    expect(montoDestinoDelPase(f)).toBe(1000);
    expect(faltantesDelPase(f)).toEqual([]);
  });

  it("sin cotización no se puede guardar el traspaso", () => {
    const f = { ...base, currencyDestino: "ARS" as const };
    expect(faltantesDelPase(f)).toEqual(["la cotización"]);
    expect(montoDestinoDelPase(f)).toBe(0);
    expect(faltantesDelPase({ ...f, cotizacion: 1450 })).toEqual([]);
  });

  it("sale en dólares de la cuenta en dólares y entran los pesos convertidos en la de pesos", () => {
    const cuentas = armarCuentas({
      companies: ["BGA"],
      guardadas: [],
      fechaCorte: "2026-01-01",
      bancosExtracto: [
        { company: "BGA", bank: "Santander", currency: "ARS", balance: 0 },
        { company: "BGA", bank: "Dolares", currency: "USD", balance: 5000 },
      ],
      efectivoApertura: [],
      personas: [],
    } as any);
    const usd = idCuentaBanco("BGA", "Dolares", "USD");
    const pesos = idCuentaBanco("BGA", "Santander", "ARS");
    const pase: PlataMovida = {
      refId: "pase-1",
      origen: "Pase",
      detalle: "Venta de dólares",
      company: "BGA",
      date: "2026-11-14",
      amount: 1000,
      amountDestino: 1450000,
      sentido: "pase",
      moneda: "USD",
      color: "blanco",
      cuentaId: usd,
      cuentaDestinoId: pesos,
    };
    const movs = movimientosPorCuenta([pase], cuentas);
    expect(movs.find((m) => m.cuentaId === usd)!.amount).toBe(-1000);
    expect(movs.find((m) => m.cuentaId === pesos)!.amount).toBe(1450000);
    const saldos = saldosDeCuentas(cuentas, movs);
    expect(saldos.find((c) => c.id === usd)!.saldo).toBe(4000);
    expect(saldos.find((c) => c.id === pesos)!.saldo).toBe(1450000);
  });
});

describe("deuda en U$S (Desendeudamiento)", () => {
  const fuente = (currency?: "ARS" | "USD"): FuentesInamovibles => ({
    vencimientos: [],
    marcas: [],
    debtPlans: [
      {
        id: 7,
        company: "BGA",
        concept: "Enchapadora",
        acreedor: "Proveedor importado",
        currency,
        nextInstallmentAmount: 500,
        remainingInstallments: 2,
        nextDueDate: "2026-11-20",
        active: true,
      },
    ],
    tarjetas: [],
    pagosCashflow: [],
    seguros: [],
    sueldos: [],
    real: new Map(),
  });

  it("su cuota vence en dólares, no en pesos", () => {
    const cuota = agendaInamovibles(fuente("USD"), "2026-11-01", "2026-11-30", "2026-11-14").find((i) => i.clave === "deuda:7:2026-11-20");
    expect(cuota).toBeTruthy();
    expect(cuota!.currency).toBe("USD");
    expect(cuota!.monto).toBe(500);
  });

  it("una deuda sin moneda sigue siendo en pesos", () => {
    const cuota = agendaInamovibles(fuente(undefined), "2026-11-01", "2026-11-30", "2026-11-14").find((i) => i.clave === "deuda:7:2026-11-20");
    expect(cuota!.currency).toBe("ARS");
  });
});
