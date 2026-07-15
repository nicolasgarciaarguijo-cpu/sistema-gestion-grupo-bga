import { aggregateReserva, RESERVA_WALLETS } from "./reserva";
import type { ReservaCurrency, ReservaLocation, ReservaMovementInput, ReservaSummary } from "./reserva";

const mov = (over: Partial<ReservaMovementInput>): ReservaMovementInput => ({
  date: "2025-11-10",
  currency: "ARS",
  location: "banco",
  color: "blanco",
  kind: "ingreso",
  amount: 1000,
  ...over,
});

const wallet = (r: ReservaSummary, currency: ReservaCurrency, location: ReservaLocation) =>
  r.wallets.find((w) => w.currency === currency && w.location === location) as ReservaSummary["wallets"][number];

const total = (r: ReservaSummary, currency: ReservaCurrency) =>
  r.totals.find((t) => t.currency === currency) as ReservaSummary["totals"][number];

describe("aggregateReserva", () => {
  it("sin datos devuelve las 4 billeteras en cero", () => {
    const r = aggregateReserva({ openings: [], movements: [] });
    expect(r.wallets).toHaveLength(4);
    expect(r.wallets.map((w) => `${w.currency}|${w.location}`)).toEqual(
      RESERVA_WALLETS.map((w) => `${w.currency}|${w.location}`)
    );
    expect(r.wallets.every((w) => w.closing === 0 && !w.negative)).toBe(true);
  });

  it("la reserva es saldo inicial mas ingresos menos egresos", () => {
    const r = aggregateReserva({
      openings: [{ currency: "ARS", location: "banco", color: "blanco", amount: 500 }],
      movements: [mov({ kind: "ingreso", amount: 1000 }), mov({ kind: "egreso", amount: 300 })],
    });
    expect(wallet(r, "ARS", "banco")).toMatchObject({
      opening: 500,
      ingresos: 1000,
      egresos: 300,
      closing: 1200,
    });
  });

  // El nucleo: pesos y dolares no se mezclan nunca.
  it("pesos y dolares se totalizan por separado, sin total unico", () => {
    const r = aggregateReserva({
      openings: [],
      movements: [
        mov({ currency: "ARS", amount: 1_000_000 }),
        mov({ currency: "USD", amount: 4000 }),
      ],
    });
    expect(total(r, "ARS").closing).toBe(1_000_000);
    expect(total(r, "USD").closing).toBe(4000);
    expect(r.totals).toHaveLength(2);
  });

  it("un pasaje mueve los saldos pero no cuenta como ingreso ni egreso", () => {
    const r = aggregateReserva({
      openings: [{ currency: "ARS", location: "banco", color: "blanco", amount: 1_400_000 }],
      movements: [
        // Pasaje de $ a USD: 1.400.000 pesos -> 1.000 dolares. La cotizacion queda implicita.
        mov({ currency: "ARS", location: "banco", kind: "egreso", amount: 1_400_000, isTransfer: true }),
        mov({ currency: "USD", location: "banco", kind: "ingreso", amount: 1000, isTransfer: true }),
      ],
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(0);
    expect(wallet(r, "USD", "banco").closing).toBe(1000);
    // Lo importante: la empresa no gano 1000 dolares ni gasto 1.400.000. Solo movio plata.
    expect(total(r, "ARS")).toMatchObject({ ingresos: 0, egresos: 0 });
    expect(total(r, "USD")).toMatchObject({ ingresos: 0, egresos: 0 });
  });

  it("el color es independiente de la ubicacion: hay plata blanca fuera del banco", () => {
    const r = aggregateReserva({
      openings: [],
      movements: [
        // Retiro del banco y guardo en la caja de seguridad: sigue siendo blanca.
        mov({ location: "banco", color: "blanco", kind: "egreso", amount: 500_000, isTransfer: true }),
        mov({ location: "efectivo", color: "blanco", kind: "ingreso", amount: 500_000, isTransfer: true }),
        mov({ location: "efectivo", color: "negro", kind: "ingreso", amount: 200_000 }),
      ],
    });
    const efectivo = wallet(r, "ARS", "efectivo");
    expect(efectivo.byColor.blanco.closing).toBe(500_000);
    expect(efectivo.byColor.negro.closing).toBe(200_000);
    expect(efectivo.closing).toBe(700_000);
  });

  it("discrimina blanco y negro dentro de la misma billetera", () => {
    const r = aggregateReserva({
      openings: [
        { currency: "ARS", location: "efectivo", color: "blanco", amount: 100 },
        { currency: "ARS", location: "efectivo", color: "negro", amount: 50 },
      ],
      movements: [
        mov({ location: "efectivo", color: "negro", kind: "ingreso", amount: 900 }),
        mov({ location: "efectivo", color: "blanco", kind: "egreso", amount: 40 }),
      ],
    });
    const w = wallet(r, "ARS", "efectivo");
    expect(w.byColor.blanco).toMatchObject({ opening: 100, egresos: 40, closing: 60 });
    expect(w.byColor.negro).toMatchObject({ opening: 50, ingresos: 900, closing: 950 });
    expect(w.closing).toBe(1010);
  });

  it("marca la billetera en negativo (lo que el usuario quiere vigilar)", () => {
    const r = aggregateReserva({
      openings: [{ currency: "ARS", location: "banco", color: "blanco", amount: 100 }],
      movements: [mov({ kind: "egreso", amount: 500 })],
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(-400);
    expect(wallet(r, "ARS", "banco").negative).toBe(true);
    expect(total(r, "ARS").negative).toBe(true);
  });

  it("el corte por fecha excluye los movimientos posteriores pero conserva el saldo inicial", () => {
    const r = aggregateReserva({
      openings: [{ currency: "ARS", location: "banco", color: "blanco", amount: 1000 }],
      movements: [
        mov({ date: "2025-11-30", kind: "ingreso", amount: 500 }),
        mov({ date: "2025-12-01", kind: "ingreso", amount: 999 }),
      ],
      until: "2025-11-30",
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(1500);
  });

  it("montos invalidos, cero o negativos no mueven la reserva", () => {
    const r = aggregateReserva({
      openings: [],
      movements: [
        mov({ amount: 0 }),
        mov({ amount: -100 }),
        mov({ amount: NaN }),
      ],
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(0);
    expect(total(r, "ARS").ingresos).toBe(0);
  });

  it("las 4 billeteras suman a sus totales por moneda", () => {
    const r = aggregateReserva({
      openings: [],
      movements: [
        mov({ currency: "ARS", location: "banco", amount: 10 }),
        mov({ currency: "ARS", location: "efectivo", amount: 20 }),
        mov({ currency: "USD", location: "banco", amount: 30 }),
        mov({ currency: "USD", location: "efectivo", amount: 40 }),
      ],
    });
    expect(total(r, "ARS").closing).toBe(30);
    expect(total(r, "USD").closing).toBe(70);
  });
});
