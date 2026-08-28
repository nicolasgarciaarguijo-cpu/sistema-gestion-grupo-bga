import {
  bankEntriesToMovements,
  buildReservaFromSources,
  cobroEntraAlEfectivo,
  costEntriesToMovements,
  gastoSaleDelEfectivo,
  internalTransfersToMovements,
  jobPaymentsToMovements,
  serieDiariaDeBilletera,
  personLedgerToMovements,
  reintegroSaleDelEfectivo,
  latestBankBalancesByAccount,
  pettyCashToMovements,
  RESERVA_OPENING_BANK_ARS,
  sumLatestBankBalances,
  usdPaymentsToMovements,
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

  it("caja chica: el fondo (con origen blanco) entra al efectivo y el gasto sale, con su color", () => {
    const r = buildReservaFromSources({
      pettyCashFunds: [{ deliveredDate: "2025-11-01", assignedAmount: 100000, assignedWhite: 100000 }],
      pettyCashExpenses: [
        { date: "2025-11-05", amount: 30000, administration: "blanco" },
        { date: "2025-11-06", amount: 20000, administration: "negro" },
      ],
    });
    const ef = wallet(r, "ARS", "efectivo");
    expect(ef.byColor.blanco.closing).toBe(70000); // 100000 blanco − 30000 blanco
    expect(ef.byColor.negro.closing).toBe(-20000); // gasto negro sin fondo negro
    expect(ef.closing).toBe(50000);
  });

  it("origen obligatorio: un fondo SIN desglose blanco/negro no se asume blanco (queda en 0)", () => {
    const r = buildReservaFromSources({
      pettyCashFunds: [{ deliveredDate: "2025-11-01", assignedAmount: 100000 }],
    });
    const ef = wallet(r, "ARS", "efectivo");
    expect(ef.byColor.blanco.closing).toBe(0);
    expect(ef.byColor.negro.closing).toBe(0);
    expect(ef.closing).toBe(0);
  });

  it("efectivo fuera del banco (caja de seguridad) entra a la billetera de efectivo por color", () => {
    const r = buildReservaFromSources({
      cashHoldings: [
        { date: "2025-11-02", currency: "ARS", color: "blanco", kind: "ingreso", amount: 500000 },
        { date: "2025-11-03", currency: "ARS", color: "negro", kind: "ingreso", amount: 200000 },
        { date: "2025-11-10", currency: "ARS", color: "negro", kind: "egreso", amount: 50000 },
      ],
    });
    const ef = wallet(r, "ARS", "efectivo");
    expect(ef.byColor.blanco.closing).toBe(500000);
    expect(ef.byColor.negro.closing).toBe(150000); // 200000 − 50000
    expect(ef.closing).toBe(650000);
  });

  it("efectivo fuera del banco respeta el corte por fecha (until)", () => {
    const r = buildReservaFromSources({
      cashHoldings: [
        { date: "2025-11-02", color: "blanco", kind: "ingreso", amount: 500000 },
        { date: "2025-12-05", color: "blanco", kind: "ingreso", amount: 999999 },
      ],
      until: "2025-11-30",
    });
    expect(wallet(r, "ARS", "efectivo").byColor.blanco.closing).toBe(500000);
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
      pettyCashFunds: [{ deliveredDate: "2025-11-01", assignedAmount: 100000, assignedWhite: 100000 }],
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

    // Una cuenta en USD (misma "bank") es OTRA cuenta: su saldo NO se mezcla con el de pesos.
    it("separa la cuenta en USD de la cuenta en pesos del mismo banco", () => {
      const mixed = [
        { company: "BGA", bank: "Santander", date: "2026-07-21", balance: 3720701.04, id: 700540 },
        { company: "BGA", bank: "Santander", date: "2026-07-17", balance: 0, id: 800100, currency: "USD" },
        { company: "BGA", bank: "Santander", date: "2026-07-13", balance: 10579.25, id: 800099, currency: "USD" },
      ];
      const accounts = latestBankBalancesByAccount(mixed);
      expect(accounts).toHaveLength(2); // pesos y dólares por separado
      const ars = accounts.find((a) => a.currency === "ARS")!;
      const usd = accounts.find((a) => a.currency === "USD")!;
      expect(ars.balance).toBeCloseTo(3720701.04, 2);
      expect(usd.balance).toBeCloseTo(0, 2); // último saldo USD (17/07), no el de 13/07
    });
  });

  describe("cobros en USD -> billetera USD", () => {
    it("un pago USD en efectivo entra a USD/efectivo con su color", () => {
      const movs = usdPaymentsToMovements([
        { paymentDate: "2026-04-14", amount: 10000, administration: "negro", transactionType: "efectivo" },
      ]);
      expect(movs).toEqual([
        { date: "2026-04-14", currency: "USD", location: "efectivo", color: "negro", kind: "ingreso", amount: 10000 },
      ]);
    });

    it("un pago USD por transferencia va a USD/banco", () => {
      const [m] = usdPaymentsToMovements([{ amount: 500, transactionType: "transferencia" }]);
      expect(m.location).toBe("banco");
      expect(m.color).toBe("blanco"); // sin administracion = blanco
    });

    it("los USD suman a la billetera USD sin tocar los pesos", () => {
      const r = buildReservaFromSources({
        openingBankArs: 1000000,
        extraMovements: usdPaymentsToMovements([
          { paymentDate: "2026-04-14", amount: 10000, transactionType: "efectivo" },
        ]),
      });
      expect(total(r, "USD").closing).toBeCloseTo(10000, 2);
      expect(total(r, "ARS").closing).toBeCloseTo(1000000, 2); // los pesos quedan intactos
      expect(wallet(r, "USD", "efectivo").closing).toBeCloseTo(10000, 2);
    });
  });
});

describe("billetera de efectivo derivada del sistema", () => {
  describe("cobros de trabajos", () => {
    it("un cobro en efectivo entra a la caja con su color", () => {
      const movs = jobPaymentsToMovements([
        { paymentDate: "2026-03-10", amount: 500000, transactionType: "efectivo", administration: "negro" },
      ]);
      expect(movs).toEqual([
        { date: "2026-03-10", currency: "ARS", location: "efectivo", color: "negro", kind: "ingreso", amount: 500000 },
      ]);
    });

    it("sin administracion cargada, el cobro en efectivo es blanco (default del tipo Payment)", () => {
      expect(jobPaymentsToMovements([{ paymentDate: "2026-03-10", amount: 100, transactionType: "efectivo" }])[0].color)
        .toBe("blanco");
    });

    it("transferencia, cheque y 'otros' NO entran: esa plata la trae el banco (o todavia no es plata)", () => {
      expect(cobroEntraAlEfectivo({ amount: 1, transactionType: "transferencia" })).toBe(false);
      expect(cobroEntraAlEfectivo({ amount: 1, transactionType: "cheque" })).toBe(false);
      expect(cobroEntraAlEfectivo({ amount: 1, transactionType: "otros" })).toBe(false);
      expect(cobroEntraAlEfectivo({ amount: 1 })).toBe(false);
    });

    it("un cobro en USD no toca la caja en pesos", () => {
      expect(cobroEntraAlEfectivo({ amount: 1, currency: "USD", transactionType: "efectivo" })).toBe(false);
    });
  });

  describe("gastos que salen de la caja", () => {
    it("un gasto en efectivo baja la caja de su color", () => {
      const movs = costEntriesToMovements([
        { date: "2026-03-11", amount: 80000, paymentMethod: "efectivo", administration: "negro" },
      ]);
      expect(movs).toEqual([
        { date: "2026-03-11", currency: "ARS", location: "efectivo", color: "negro", kind: "egreso", amount: 80000 },
      ]);
    });

    it("sin metodo de pago cargado se asume efectivo (dato faltante, la UI lo marca)", () => {
      expect(gastoSaleDelEfectivo({ date: "2026-03-11", amount: 1 })).toBe(true);
    });

    it("lo que paso por el banco no baja la caja: ya bajo el saldo bancario", () => {
      expect(gastoSaleDelEfectivo({ date: "", amount: 1, paymentMethod: "transferencia" })).toBe(false);
      expect(gastoSaleDelEfectivo({ date: "", amount: 1, paymentMethod: "cheque" })).toBe(false);
      expect(gastoSaleDelEfectivo({ date: "", amount: 1, paymentMethod: "debito" })).toBe(false);
      expect(gastoSaleDelEfectivo({ date: "", amount: 1, source: "extracto" })).toBe(false);
      expect(gastoSaleDelEfectivo({ date: "", amount: 1, paymentMethod: "efectivo", bankEntryId: 7 })).toBe(false);
    });
  });

  describe("movimientos internos (efectivo <-> banco)", () => {
    it("un deposito saca plata de la caja y NO suma al banco (el extracto ya lo trae)", () => {
      const movs = internalTransfersToMovements([
        { date: "2026-03-12", direction: "efectivo_a_banco", amount: 300000, color: "blanco" },
      ]);
      expect(movs).toHaveLength(1);
      expect(movs[0]).toMatchObject({ location: "efectivo", kind: "egreso", amount: 300000, isTransfer: true });
    });

    it("una extraccion entra a la caja", () => {
      const movs = internalTransfersToMovements([
        { date: "2026-03-12", direction: "banco_a_efectivo", amount: 200000 },
      ]);
      expect(movs[0]).toMatchObject({ location: "efectivo", kind: "ingreso", color: "blanco", isTransfer: true });
    });

    it("el pase mueve el saldo pero no cuenta como ingreso ni egreso de la empresa", () => {
      const r = buildReservaFromSources({
        jobPayments: [{ paymentDate: "2026-03-01", amount: 1000000, transactionType: "efectivo" }],
        internalTransfers: [{ date: "2026-03-05", direction: "efectivo_a_banco", amount: 400000 }],
      });
      const caja = wallet(r, "ARS", "efectivo");
      expect(caja.closing).toBeCloseTo(600000, 2);
      expect(caja.ingresos).toBeCloseTo(1000000, 2); // el pase no infla los ingresos
      expect(caja.egresos).toBeCloseTo(0, 2); // ni los egresos
    });
  });

  it("caso completo: cobro negro en efectivo - gasto negro + deposito", () => {
    const r = buildReservaFromSources({
      openingBankArs: 4302064.53,
      jobPayments: [
        { paymentDate: "2026-03-01", amount: 5000000, transactionType: "efectivo", administration: "negro" },
        { paymentDate: "2026-03-02", amount: 9000000, transactionType: "transferencia", administration: "blanco" },
      ],
      costEntries: [
        { date: "2026-03-03", amount: 1200000, paymentMethod: "efectivo", administration: "negro" },
        { date: "2026-03-04", amount: 700000, paymentMethod: "transferencia", administration: "blanco" },
      ],
      internalTransfers: [{ date: "2026-03-06", direction: "efectivo_a_banco", amount: 800000, color: "negro" }],
    });
    const caja = wallet(r, "ARS", "efectivo");
    expect(caja.byColor.negro.closing).toBeCloseTo(3000000, 2); // 5.000.000 - 1.200.000 - 800.000
    expect(caja.byColor.blanco.closing).toBeCloseTo(0, 2); // lo blanco fue todo por banco
    expect(wallet(r, "ARS", "banco").closing).toBeCloseTo(4302064.53, 2); // el banco sigue siendo el extracto
  });
});

describe("reintegros de la cuenta corriente con la gente", () => {
  it("devolverle la plata en efectivo baja la caja", () => {
    const movs = personLedgerToMovements([
      { date: "2026-03-15", amount: 250000, kind: "haber", paymentMethod: "efectivo", color: "negro" },
    ]);
    expect(movs).toEqual([
      { date: "2026-03-15", currency: "ARS", location: "efectivo", color: "negro", kind: "egreso", amount: 250000 },
    ]);
  });

  it("el DEBE no mueve la caja: la plata la puso la persona, no la empresa", () => {
    expect(reintegroSaleDelEfectivo({ date: "", amount: 1, kind: "debe", paymentMethod: "efectivo" })).toBe(false);
  });

  it("un reintegro por transferencia no baja la caja: ya salio por el banco", () => {
    expect(reintegroSaleDelEfectivo({ date: "", amount: 1, kind: "haber", paymentMethod: "transferencia" })).toBe(false);
    expect(reintegroSaleDelEfectivo({ date: "", amount: 1, kind: "haber", paymentMethod: "cheque" })).toBe(false);
  });

  it("sin metodo cargado se asume efectivo", () => {
    expect(reintegroSaleDelEfectivo({ date: "", amount: 1, kind: "haber" })).toBe(true);
  });

  it("el reintegro en efectivo achica la billetera de efectivo", () => {
    const r = buildReservaFromSources({
      jobPayments: [{ paymentDate: "2026-03-01", amount: 1000000, transactionType: "efectivo" }],
      personLedgerEntries: [{ date: "2026-03-15", amount: 250000, kind: "haber", paymentMethod: "efectivo" }],
    });
    expect(wallet(r, "ARS", "efectivo").closing).toBeCloseTo(750000, 2);
  });
});

describe("serieDiariaDeBilletera", () => {
  const dias = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];

  it("el efectivo se acumula dia a dia y arrastra el saldo a los dias sin movimiento", () => {
    const s = serieDiariaDeBilletera(
      {
        jobPayments: [
          { paymentDate: "2026-03-02", amount: 500000, transactionType: "efectivo", administration: "negro" },
        ],
        costEntries: [{ date: "2026-03-04", amount: 120000, paymentMethod: "efectivo", administration: "negro" }],
      },
      dias
    );
    expect(s.map((d) => d.efectivoNegro)).toEqual([0, 500000, 500000, 380000]);
  });

  it("separa blanco de negro", () => {
    const s = serieDiariaDeBilletera(
      {
        jobPayments: [
          { paymentDate: "2026-03-01", amount: 100000, transactionType: "efectivo", administration: "blanco" },
          { paymentDate: "2026-03-01", amount: 700000, transactionType: "efectivo", administration: "negro" },
        ],
      },
      dias
    );
    expect(s[0].efectivoBlanco).toBe(100000);
    expect(s[0].efectivoNegro).toBe(700000);
  });

  it("el banco NO se acumula: sale del ultimo saldo del extracto hasta ese dia", () => {
    const s = serieDiariaDeBilletera(
      {
        bankBalanceEntries: [
          { company: "X", bank: "Patagonia", date: "2026-03-01", balance: 1000, id: 1 },
          { company: "X", bank: "Patagonia", date: "2026-03-03", balance: 2500, id: 2 },
        ],
      },
      dias
    );
    // el 02 no tiene movimiento: arrastra el saldo del 01. El 04 arrastra el del 03.
    expect(s.map((d) => d.banco)).toEqual([1000, 1000, 2500, 2500]);
  });

  it("el pase de efectivo al banco baja la caja sin tocar el saldo bancario", () => {
    const s = serieDiariaDeBilletera(
      {
        jobPayments: [{ paymentDate: "2026-03-01", amount: 900000, transactionType: "efectivo" }],
        internalTransfers: [{ date: "2026-03-03", direction: "efectivo_a_banco", amount: 400000 }],
        bankBalanceEntries: [{ company: "X", bank: "Santander", date: "2026-03-01", balance: 50, id: 1 }],
      },
      dias
    );
    expect(s.map((d) => d.efectivoBlanco)).toEqual([900000, 900000, 500000, 500000]);
    expect(s.map((d) => d.banco)).toEqual([50, 50, 50, 50]);
  });

  it("el reintegro en efectivo baja la caja el dia que se paga", () => {
    const s = serieDiariaDeBilletera(
      {
        jobPayments: [{ paymentDate: "2026-03-01", amount: 300000, transactionType: "efectivo" }],
        personLedgerEntries: [{ date: "2026-03-03", amount: 50000, kind: "haber", paymentMethod: "efectivo" }],
      },
      dias
    );
    expect(s.map((d) => d.efectivoBlanco)).toEqual([300000, 300000, 250000, 250000]);
  });
});
