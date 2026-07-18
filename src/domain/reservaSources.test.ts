import {
  bankEntriesToMovements,
  buildReservaFromSources,
  latestBankBalancesByAccount,
  pettyCashToMovements,
  RESERVA_OPENING_BANK_ARS,
  sumLatestBankBalances,
} from "./reservaSources";

const wallet = (r: ReturnType<typeof buildReservaFromSources>, cur: "ARS" | "USD", loc: "banco" | "efectivo") =>
  r.wallets.find((w) => w.currency === cur && w.location === loc)!;
const total = (r: ReturnType<typeof buildReservaFromSources>, cur: "ARS" | "USD") =>
  r.totals.find((t) => t.currency === cur)!;

describe("reservaSources", () => {
  it("el saldo inicial de banco arranca la billetera banco/pesos", () => {
    const r = buildReservaFromSources({ openingBankArs: 4302064.53 });
    expect(wallet(r, "ARS", "banco").closing).toBeCloseTo(4302064.53, 2);
  });

  it("banco: credito suma, debito resta sobre el saldo inicial", () => {
    const r = buildReservaFromSources({
      openingBankArs: 1000,
      bankEntries: [
        { date: "2025-11-05", movementType: "credito", amount: 500 },
        { date: "2025-11-10", movementType: "debito", amount: 200 },
      ],
    });
    const w = wallet(r, "ARS", "banco");
    expect(w).toMatchObject({ ingresos: 500, egresos: 200 });
    expect(w.closing).toBe(1300);
  });

  // Reproduce la cadena real de De Raíz Patagonia: nov abre 4.302.064,53 y cierra 990.055,86.
  it("reproduce el cierre real del banco cuando el neto del mes es correcto", () => {
    // neto nov De Raíz = 990.055,86 − 4.302.064,53 = −3.312.008,67
    const r = buildReservaFromSources({
      openingBankArs: 4302064.53,
      bankEntries: [{ date: "2025-11-28", movementType: "debito", amount: 3312008.67 }],
      until: "2025-11-30",
    });
    expect(wallet(r, "ARS", "banco").closing).toBeCloseTo(990055.86, 2);
  });

  it("caja chica: el fondo entra al efectivo y el gasto sale, con su color", () => {
    const r = buildReservaFromSources({
      pettyCashFunds: [{ deliveredDate: "2025-11-01", assignedAmount: 100000 }],
      pettyCashExpenses: [
        { date: "2025-11-05", amount: 30000, administration: "blanco" },
        { date: "2025-11-06", amount: 20000, administration: "negro" },
      ],
    });
    const ef = wallet(r, "ARS", "efectivo");
    expect(ef.byColor.blanco.closing).toBe(70000); // 100000 asignado − 30000 blanco
    expect(ef.byColor.negro.closing).toBe(-20000); // gasto negro sin fondo negro
    expect(ef.closing).toBe(50000);
  });

  it("un fondo con desglose blanco/negro parte el ingreso por color", () => {
    const movs = pettyCashToMovements(
      [{ deliveredDate: "2025-11-01", assignedAmount: 150000, assignedWhite: 100000, assignedBlack: 50000 }],
      []
    );
    expect(movs).toHaveLength(2);
    expect(movs.find((m) => m.color === "blanco")!.amount).toBe(100000);
    expect(movs.find((m) => m.color === "negro")!.amount).toBe(50000);
  });

  it("banco y efectivo conviven sin mezclarse en el total de pesos", () => {
    const r = buildReservaFromSources({
      openingBankArs: 500000,
      pettyCashFunds: [{ deliveredDate: "2025-11-01", assignedAmount: 100000 }],
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(500000);
    expect(wallet(r, "ARS", "efectivo").closing).toBe(100000);
    expect(total(r, "ARS").closing).toBe(600000);
  });

  it("los dólares arrancan y quedan en cero (no hay cuentas USD con saldo)", () => {
    const r = buildReservaFromSources({ openingBankArs: 461433.46 });
    expect(total(r, "USD").closing).toBe(0);
  });

  it("el corte por fecha deja ver la reserva a un mes dado", () => {
    const r = buildReservaFromSources({
      openingBankArs: 1000,
      bankEntries: [
        { date: "2025-11-30", movementType: "credito", amount: 500 },
        { date: "2025-12-15", movementType: "credito", amount: 9999 },
      ],
      until: "2025-11-30",
    });
    expect(wallet(r, "ARS", "banco").closing).toBe(1500);
  });

  it("bankEntriesToMovements marca banco/pesos/blanco", () => {
    const [m] = bankEntriesToMovements([{ date: "2025-11-01", movementType: "credito", amount: 1 }]);
    expect(m).toMatchObject({ location: "banco", currency: "ARS", color: "blanco", kind: "ingreso" });
  });

  it("el seed de octubre tiene las dos empresas", () => {
    expect(RESERVA_OPENING_BANK_ARS["De raiz s.r.l"]).toBeCloseTo(4302064.53, 2);
    expect(RESERVA_OPENING_BANK_ARS["BGA estudio de diseño y produccion industrial s.r.l"]).toBeCloseTo(461433.46, 2);
  });

  describe("latestBankBalancesByAccount / sumLatestBankBalances", () => {
    // BGA tiene 2 cuentas; De Raíz 1. El ultimo saldo por cuenta es la plata que hay.
    const entries = [
      { company: "BGA", bank: "Santander", date: "2026-06-01", balance: 999, id: 10 },
      { company: "BGA", bank: "Santander", date: "2026-06-29", balance: -20150.48, id: 20 },
      { company: "BGA", bank: "Patagonia", date: "2026-07-15", balance: 25278.06, id: 5 },
      { company: "De Raíz", bank: "Patagonia", date: "2026-05-29", balance: 3110482.54, id: 1 },
    ];

    it("toma el saldo del ultimo movimiento de cada cuenta", () => {
      const rows = latestBankBalancesByAccount(entries);
      expect(rows).toHaveLength(3);
      const sant = rows.find((r) => r.bank === "Santander" && r.company === "BGA")!;
      expect(sant.balance).toBeCloseTo(-20150.48, 2);
      expect(sant.date).toBe("2026-06-29");
    });

    it("suma los ultimos saldos de todas las cuentas", () => {
      expect(sumLatestBankBalances(entries)).toBeCloseTo(-20150.48 + 25278.06 + 3110482.54, 2);
    });

    // Santander se carga cronologico (id sube con la fecha): el dia-cierre es el id MAS ALTO.
    it("desempate intradia Santander: id mas alto = cierre del dia", () => {
      const sant = [
        { company: "BGA", bank: "Santander", date: "2026-06-01", balance: 999, id: 700100 },
        { company: "BGA", bank: "Santander", date: "2026-06-29", balance: 13660.51, id: 700487 },
        { company: "BGA", bank: "Santander", date: "2026-06-29", balance: -20150.48, id: 700488 },
      ];
      expect(latestBankBalancesByAccount(sant)[0].balance).toBeCloseTo(-20150.48, 2);
    });

    // Patagonia sale del Excel al reves (id baja con la fecha): el dia-cierre es el id MAS BAJO.
    // Caso real De Raíz 16/07: debe elegir 1.102.513,21 (id 246243), NO -1.088.715,53 (id 246247).
    it("desempate intradia Patagonia: id mas bajo = cierre del dia", () => {
      const pat = [
        { company: "De raiz s.r.l", bank: "Patagonia", date: "2026-05-29", balance: 3110482.54, id: 246300 },
        { company: "De raiz s.r.l", bank: "Patagonia", date: "2026-07-16", balance: 1102513.21, id: 246243 },
        { company: "De raiz s.r.l", bank: "Patagonia", date: "2026-07-16", balance: -1088715.53, id: 246247 },
      ];
      expect(latestBankBalancesByAccount(pat)[0].balance).toBeCloseTo(1102513.21, 2);
    });

    it("respeta el corte por fecha (until)", () => {
      // cortando en junio, Patagonia de julio no cuenta
      expect(sumLatestBankBalances(entries, "2026-06-30")).toBeCloseTo(-20150.48 + 3110482.54, 2);
    });
  });
});
