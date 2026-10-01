import {
  buildMarcadoresHtml,
  buildClientBudgetHtml,
  buildJobClientSummaryHtml,
  buildJobMaterialsHtml,
} from "./exportHtml";

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

// El resumen de materiales se imprime para pasarselo al taller o al proveedor: lleva cantidades y
// descripcion, NUNCA precios.
describe("buildJobMaterialsHtml", () => {
  const job = {
    budgetNumber: "0001-00000123",
    client: "CLIENTE SA",
    project: "PROYECTO X",
    company: "De raiz s.r.l",
    deliveryDate: "2026-10-01",
    snapshot: {
      subBudgets: [
        {
          title: "Mesa",
          notes: "roble",
          materials: [{ description: "Tabla roble", qty: 4, unit: "m2", unitPrice: 123456 }],
          basicSupplies: [],
        },
        {
          title: "Puerta",
          quantity: 3,
          materials: [{ description: "Bisagra", qty: 2, unit: "u", unitPrice: 7777 }],
          basicSupplies: [],
        },
      ],
      materials: [],
      basicSupplies: [],
    },
  };

  it("lista cada subpresupuesto con su cantidad y descripcion", () => {
    const html = buildJobMaterialsHtml(job);
    expect(html).toContain("Tabla roble");
    expect(html).toContain("Mesa");
    expect(html).toContain("Puerta &times;3");
    expect(html).toContain("0001-00000123");
    expect(html).toContain("CLIENTE SA");
  });

  it("no muestra precios", () => {
    const html = buildJobMaterialsHtml(job);
    expect(html).not.toContain("123.456");
    expect(html).not.toContain("7.777");
    expect(html).not.toMatch(/\$\s*\d/);
  });

  it("la cantidad ya viene escalada por las unidades del bloque", () => {
    const html = buildJobMaterialsHtml(job);
    expect(html).toContain(">6 <span"); // 2 por unidad x 3 unidades
    expect(html).toContain("(2 c/u)");
  });

  it("se abre listo para imprimir (guardar como PDF)", () => {
    expect(buildJobMaterialsHtml(job)).toContain("window.print()");
  });

  it("trabajo sin materiales: avisa en vez de salir en blanco", () => {
    const html = buildJobMaterialsHtml({ budgetNumber: "1", client: "X", snapshot: {} });
    expect(html).toContain("no tiene materiales cargados");
  });
});

// El resumen al cliente tiene que mostrar TODO el trabajo: de donde sale el valor, los adicionales en
// su moneda, la parte en dolares con su propio saldo, y la cuenta de la empresa del trabajo al pie.
describe("buildJobClientSummaryHtml · adicionales, dolares y cuenta bancaria", () => {
  const base = {
    budgetNumber: "4001",
    client: "CLIENTE",
    project: "COCINA",
    company: "De raiz s.r.l",
    soldNetPrice: 1000000,
    invoiceVatAmount: 0,
    additionalsWhiteNet: 100000,
    additionalsBlackNet: 0,
    additionalsVat: 21000,
    discountsTotal: 0,
    valueToCollect: 1121000,
    collectedTotal: 0,
    remainingToPay: 1121000,
    invoices: [],
    payments: [{ paymentDate: "2026-09-01", amount: 500, currency: "USD" }],
    retentions: [],
    soldNetPriceUsd: 2000,
    additionals: [
      { id: 1, date: "2026-09-02", description: "ZOCALOS", amount: 100000, administration: "blanco", vatRate: 21, notes: "" },
      { id: 2, date: "2026-09-03", description: "MARMOL EXTRA", amount: 1000, administration: "negro", currency: "USD", notes: "" },
    ],
  };

  it("lista los adicionales cada uno en su moneda, con totales separados", () => {
    const html = buildJobClientSummaryHtml(base);
    expect(html).toContain("ZOCALOS");
    expect(html).toContain("121.000,00");
    expect(html).toContain("MARMOL EXTRA (U$S)");
    expect(html).toContain("Total adicionales U$S");
    expect(html).toContain("Composici&oacute;n del valor");
  });

  it("la parte en dolares tiene su propio cierre: vendido + adicionales - cobrado", () => {
    const html = buildJobClientSummaryHtml(base);
    expect(html).toContain("Valor del trabajo U$S");
    expect(html).toContain("C&oacute;mo cierra el saldo en d&oacute;lares");
    // 2.000 + 1.000 - 500 = 2.500
    expect(html).toMatch(/Saldo pendiente U\$S<\/td><td class="num">U\$S.2\.500,00/);
  });

  it("al pie va la cuenta de la empresa que se le pasa", () => {
    const html = buildJobClientSummaryHtml(base, {
      holder: "De raiz s.r.l",
      bankName: "Banco Patagonia",
      bankCbu: "0340041800419997078004",
      bankAlias: "DERAIZSRL",
    });
    expect(html).toContain("Datos para transferencia");
    expect(html).toContain("0340041800419997078004");
    expect(html).toContain("DERAIZSRL");
  });

  it("sin dolares ni banco no aparecen esos bloques", () => {
    const html = buildJobClientSummaryHtml({ ...base, soldNetPriceUsd: 0, payments: [], additionals: [] });
    expect(html).not.toContain("U$S");
    expect(html).not.toContain("Datos para transferencia");
  });
});

// Arriba del resumen va el anticipo pactado partido en blanco (con IVA facturado) y negro.
describe("buildJobClientSummaryHtml · anticipo blanco / negro", () => {
  const job = {
    budgetNumber: "4002",
    client: "C",
    company: "BGA",
    soldNetPrice: 1000000,
    billedPct: 30,
    anticipoPctResolved: 50,
    invoiceVatAmount: 63000,
    valueToCollect: 1063000,
    collectedTotal: 0,
    remainingToPay: 1063000,
  };

  it("parte el anticipo: 50% de 1.000.000 = 500.000 -> 150.000 + IVA 63.000 blanco, 350.000 negro", () => {
    const html = buildJobClientSummaryHtml(job);
    expect(html).toContain("Anticipo en blanco (c/IVA)");
    expect(html).toContain("213.000,00");
    expect(html).toContain("Anticipo negro");
    expect(html).toContain("350.000,00");
  });

  it("todo facturado: no hay anticipo negro", () => {
    const html = buildJobClientSummaryHtml({ ...job, billedPct: 100 });
    expect(html).toContain("Anticipo en blanco");
    expect(html).not.toContain("Anticipo negro");
  });

  it("sin anticipo pactado no salen las tarjetas", () => {
    const html = buildJobClientSummaryHtml({ ...job, anticipoPctResolved: 0 });
    expect(html).not.toContain("Anticipo");
  });
});
