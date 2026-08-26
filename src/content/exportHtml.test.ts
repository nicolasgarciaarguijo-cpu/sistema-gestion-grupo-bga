import { buildMarcadoresHtml, buildClientBudgetHtml, buildJobClientSummaryHtml } from "./exportHtml";

// El resumen de marcadores existe para comparar meses: si las cuentas cambian, la evolucion miente.
describe("buildMarcadoresHtml", () => {
  const base = {
    companyLabel: "De raiz s.r.l",
    monthKey: "2026-07",
    percentages: {
      markupPct: 30,
      deviationPct: 5,
      laborDeviationPct: 0,
      vatPct: 21,
      commissionPct: 3,
      stockIncreasePct: 0,
      allocationMode: "auto",
      manualAllocationPct: 18.75,
    },
    fixedMarkers: [
      { group: "Alquiler", amount: 1000, active: true },
      { group: "Alquiler", amount: 500, active: true },
      { group: "Servicios", amount: 300, active: true },
      { group: "Servicios", amount: 999, active: false }, // inactivo: no suma
    ],
    supplyMarkers: [{ qty: 2, unitPrice: 50, active: true }],
    laborMarkers: [{ employees: 2, monthlyHoursPerEmployee: 100, hourlyRate: 10, active: true }],
    personalProvisionMarkers: [
      { amountPerDelivery: 1200, periodicityMonths: 6, active: true }, // 200/mes
      { amountPerDelivery: 500, periodicityMonths: 0, active: true }, // sin periodicidad: no prorratea
    ],
  };

  it("suma solo los marcadores activos y agrupa los costos fijos", () => {
    const html = buildMarcadoresHtml(base);
    expect(html).toContain("Alquiler");
    // 1000 + 500 + 300 = 1800 (el de 999 esta inactivo)
    expect(html).toMatch(/1\.800/);
    expect(html).not.toMatch(/2\.799/);
  });

  it("la mano de obra mensual es empleados x horas x valor hora", () => {
    // 2 x 100 x 10 = 2000
    expect(buildMarcadoresHtml(base)).toMatch(/2\.000/);
  });

  it("las provisiones se prorratean por su periodicidad y no dividen por cero", () => {
    const html = buildMarcadoresHtml(base);
    expect(html).toMatch(/\$\s?200/); // 1200 / 6 meses
    expect(html).not.toMatch(/Infinity|NaN/);
  });

  it("no explota sin marcadores cargados", () => {
    const html = buildMarcadoresHtml({
      ...base,
      fixedMarkers: [],
      supplyMarkers: [],
      laborMarkers: [],
      personalProvisionMarkers: [],
    });
    expect(html).toContain("Sin costos fijos activos");
    expect(html).not.toMatch(/NaN/);
  });
});

// El presupuesto puede tener bloques en pesos y bloques en U$S; nunca se suman ni se convierten. El
// export al cliente tiene que mostrar cada bloque con su signo y el total en dólares aparte.
describe("buildClientBudgetHtml · moneda por bloque", () => {
  const theme = { short: "BGA", primary: "#123456", soft: "#eee" };
  const make = (subBudgets: any[], totals: any) =>
    buildClientBudgetHtml(
      {
        number: "3423",
        client: "Cliente Test",
        project: "Diseño de dormitorio",
        netPrice: totals.netPrice,
        finalPrice: totals.finalPrice,
        snapshot: { budget: {}, subBudgets, totals },
      },
      theme
    );

  it("un bloque en U$S se exporta con signo U$S, no con $", () => {
    const html = make(
      [{ title: "Marmolería", currency: "USD", totals: { netPrice: 1000, finalPrice: 1210 } }],
      { netPrice: 0, finalPrice: 0 } // consolidado en pesos = 0 (todo el presupuesto es USD)
    );
    expect(html).toContain("U$S");
    expect(html).toMatch(/U\$S[\s ]*1\.210,00/); // total del bloque en dólares
    // No debe aparecer un total en pesos $ 0 cuando todo es en dólares.
    expect(html).not.toMatch(/Precio final c\/IVA[^U]*\$[\s ]*0,00/);
  });

  it("con bloques mixtos, el total de pesos y el de dólares van separados", () => {
    const html = make(
      [
        { title: "Mobiliario", currency: "ARS", totals: { netPrice: 2145, finalPrice: 2595.45 } },
        { title: "Marmolería", currency: "USD", totals: { netPrice: 800, finalPrice: 968 } },
      ],
      { netPrice: 2145, finalPrice: 2595.45 } // consolidado = solo pesos
    );
    expect(html).toMatch(/2\.595,45/); // total en pesos
    expect(html).toMatch(/U\$S[\s ]*968,00/); // total en dólares aparte
    expect(html).toContain("(pesos)");
    expect(html).toContain("(U$S)");
  });

  it("un presupuesto todo en pesos no muestra ningún signo de dólar", () => {
    const html = make(
      [{ title: "Mobiliario", currency: "ARS", totals: { netPrice: 2145, finalPrice: 2595.45 } }],
      { netPrice: 2145, finalPrice: 2595.45 }
    );
    expect(html).toContain("2.595,45");
    expect(html).not.toContain("U$S");
  });
});

// El resumen que se le manda al cliente tiene que CERRAR: si las retenciones no figuran, el cliente
// suma los pagos, no le da el saldo que ve arriba y llama preguntando por plata que ya pago.
describe("buildJobClientSummaryHtml · retenciones", () => {
  const job = {
    budgetNumber: "3265",
    client: "ERI JOSEVICH",
    project: "VANITORY",
    company: "De raiz s.r.l",
    executionStatus: "finalizado",
    valueToCollect: 1600000,
    collectedTotal: 1522612,
    remainingToPay: 77388,
    invoices: [{ invoiceDate: "2026-02-05", invoiceType: "A", invoiceNumber: "112", total: 1092706.23 }],
    payments: [
      { paymentDate: "2026-02-05", transactionType: "Transferencia", amount: 1070094.34 },
      { paymentDate: "2026-04-13", transactionType: "Transferencia", amount: 429905.77 },
    ],
    retentions: [
      { retentionDate: "2026-02-05", retentionType: "RET. GG", retentionNumber: "A-1", amount: 13581.26 },
      { retentionDate: "2026-02-05", retentionType: "RET. SUSS", retentionNumber: "A-2", amount: 9030.63 },
    ],
  };

  it("lista cada retencion con su tipo, numero y monto", () => {
    const html = buildJobClientSummaryHtml(job);
    expect(html).toContain("RET. GG");
    expect(html).toContain("RET. SUSS");
    expect(html).toContain("13.581,26");
    expect(html).toContain("Total retenciones");
    expect(html).toContain("22.611,89"); // 13.581,26 + 9.030,63
  });

  it("el cierre muestra la resta completa y llega al saldo", () => {
    const html = buildJobClientSummaryHtml(job);
    expect(html).toContain("C&oacute;mo cierra el saldo");
    expect(html).toContain("1.500.000,11"); // total de pagos
    expect(html).toContain("Saldo pendiente");
    // 1.600.000 - 1.500.000,11 - 22.611,89 = 77.388, el mismo saldo de la tarjeta de arriba
    expect(html).toContain("77.388,00");
    // pagos + retenciones ya explican todo lo cobrado: no hay renglon suelto
    expect(html).not.toContain("Otras cobranzas registradas");
  });

  it("una cobranza cargada a mano en el calendario aparece como renglon aparte", () => {
    // collectedTotal trae 100.000 mas de lo que explican pagos + retenciones: sin este renglon el
    // cliente no puede atar el saldo con la resta.
    const html = buildJobClientSummaryHtml({ ...job, collectedTotal: 1622612, remainingToPay: 0 });
    expect(html).toContain("Otras cobranzas registradas");
    expect(html).toContain("100.000,00");
  });

  it("si se cobro de mas, el sobrante se muestra a favor del cliente", () => {
    const html = buildJobClientSummaryHtml({ ...job, collectedTotal: 1650000, remainingToPay: 0 });
    expect(html).toContain("Saldo a favor del cliente");
    expect(html).toContain("50.000,00");
  });

  it("sin retenciones, la tabla queda vacia pero el bloque sigue estando", () => {
    const html = buildJobClientSummaryHtml({ ...job, retentions: [] });
    expect(html).toContain("Sin retenciones aplicadas.");
  });

  it("un pago en U$S pesificado entra a los pesos por su equivalente, no por el nominal", () => {
    const html = buildJobClientSummaryHtml({
      ...job,
      payments: [
        { paymentDate: "2026-04-14", transactionType: "Efectivo", amount: 10000, currency: "USD", arsApplied: true, exchangeRate: 1380 },
      ],
    });
    expect(html).toContain("13.800.000,00");
    expect(html).not.toContain("Pagos recibidos en d&oacute;lares");
  });

  it("un pago en dolares puros va en su propia tabla y NO se suma a los pesos", () => {
    const html = buildJobClientSummaryHtml({
      ...job,
      payments: [{ paymentDate: "2026-04-14", transactionType: "Efectivo", amount: 10000, currency: "USD" }],
    });
    expect(html).toContain("Pagos recibidos en d&oacute;lares");
    expect(html).toContain("Total cobrado U$S");
    expect(html).toContain("Sin pagos registrados.");
  });
});
