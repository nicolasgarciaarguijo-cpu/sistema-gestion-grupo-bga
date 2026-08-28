import { buildPersonLedger, carryPettyCashDebt, normalizePersonName } from "./personLedger";

const cuenta = (r: ReturnType<typeof buildPersonLedger>, nombre: string) =>
  r.accounts.find((a) => normalizePersonName(a.person) === normalizePersonName(nombre))!;

describe("carryPettyCashDebt", () => {
  it("una caja sobregirada deja deuda con el responsable", () => {
    const r = carryPettyCashDebt([
      { id: 1, company: "X", responsible: "Marta", assignedAmount: 100000, renderedAmount: 150000 },
    ]);
    expect(r.total).toBeCloseTo(50000, 2);
    expect(r.byFund.get(1)).toEqual({ ajuste: 0, adjustedRemaining: -50000 });
  });

  it("un fondo posterior del mismo responsable absorbe la deuda vieja", () => {
    const r = carryPettyCashDebt([
      { id: 1, company: "X", responsible: "Marta", assignedAmount: 100000, renderedAmount: 150000 },
      { id: 2, company: "X", responsible: "Marta", assignedAmount: 200000, renderedAmount: 120000 },
    ]);
    expect(r.byFund.get(2)).toEqual({ ajuste: 50000, adjustedRemaining: 30000 });
    expect(r.total).toBeCloseTo(0, 2);
  });

  it("la deuda de una persona no tapa la de otra", () => {
    const r = carryPettyCashDebt([
      { id: 1, company: "X", responsible: "Marta", assignedAmount: 100000, renderedAmount: 150000 },
      { id: 2, company: "X", responsible: "Julio", assignedAmount: 200000, renderedAmount: 120000 },
    ]);
    expect(r.total).toBeCloseTo(50000, 2);
    expect(r.byResponsible.get(normalizePersonName("Marta"))?.debt).toBeCloseTo(50000, 2);
  });

  it("los fondos sin responsable no se mezclan entre si", () => {
    const r = carryPettyCashDebt([
      { id: 1, company: "X", assignedAmount: 100000, renderedAmount: 150000 },
      { id: 2, company: "X", assignedAmount: 200000, renderedAmount: 120000 },
    ]);
    expect(r.total).toBeCloseTo(50000, 2); // el saldo del fondo 2 NO tapa el sobregiro del 1
  });
});

describe("buildPersonLedger", () => {
  it("una factura que puso alguien es DEBE", () => {
    const r = buildPersonLedger({
      invoices: [
        { id: 7, company: "X", paidByPerson: "Marta", invoiceDate: "2026-03-01", total: 120000, supplier: "Ferretería" },
      ],
    });
    expect(cuenta(r, "Marta").saldo).toBeCloseTo(120000, 2);
    expect(r.total).toBeCloseTo(120000, 2);
  });

  it("marcarla reintegrada en Compras emite el HABER que la cancela, sin borrar la historia", () => {
    const r = buildPersonLedger({
      invoices: [
        {
          id: 7, company: "X", paidByPerson: "Marta", invoiceDate: "2026-03-01",
          reimbursedAt: "2026-03-20", total: 120000,
        },
      ],
    });
    const c = cuenta(r, "Marta");
    expect(c.debe).toBeCloseTo(120000, 2);
    expect(c.haber).toBeCloseTo(120000, 2);
    expect(c.saldo).toBeCloseTo(0, 2);
    expect(c.movements).toHaveLength(2); // los dos movimientos quedan a la vista
  });

  it("una factura sin persona cargada no entra: la pago la empresa", () => {
    const r = buildPersonLedger({ invoices: [{ id: 7, company: "X", invoiceDate: "2026-03-01", total: 120000 }] });
    expect(r.accounts).toHaveLength(0);
  });

  it("la caja chica excedida entra como DEBE del responsable", () => {
    const r = buildPersonLedger({
      pettyCashFunds: [
        { id: 1, company: "X", responsible: "Julio", deliveredDate: "2026-03-02", assignedAmount: 80000, renderedAmount: 95000 },
      ],
    });
    expect(cuenta(r, "Julio").saldo).toBeCloseTo(15000, 2);
  });

  it("el ajuste contra un fondo posterior aparece como HABER y deja el saldo en cero", () => {
    const r = buildPersonLedger({
      pettyCashFunds: [
        { id: 1, company: "X", responsible: "Julio", deliveredDate: "2026-03-02", assignedAmount: 80000, renderedAmount: 95000 },
        { id: 2, company: "X", responsible: "Julio", deliveredDate: "2026-04-02", assignedAmount: 100000, renderedAmount: 60000 },
      ],
    });
    const c = cuenta(r, "Julio");
    expect(c.debe).toBeCloseTo(15000, 2);
    expect(c.haber).toBeCloseTo(15000, 2);
    expect(c.saldo).toBeCloseTo(0, 2);
  });

  it("junta en UNA cuenta la factura, la caja chica excedida y lo cargado a mano", () => {
    const r = buildPersonLedger({
      invoices: [{ id: 7, company: "X", paidByPerson: "Marta", invoiceDate: "2026-03-01", total: 100000 }],
      pettyCashFunds: [
        { id: 1, company: "X", responsible: "marta", deliveredDate: "2026-03-02", assignedAmount: 50000, renderedAmount: 70000 },
      ],
      entries: [
        { id: 90, company: "X", person: "MARTA", date: "2026-03-05", kind: "debe", amount: 30000, description: "imprevisto: flete" },
        { id: 91, company: "X", person: "Marta", date: "2026-03-10", kind: "haber", amount: 60000, paymentMethod: "efectivo" },
      ],
    });
    expect(r.accounts).toHaveLength(1); // "marta", "MARTA" y "Marta" son la misma persona
    const c = cuenta(r, "Marta");
    expect(c.debe).toBeCloseTo(150000, 2); // 100.000 + 20.000 + 30.000
    expect(c.haber).toBeCloseTo(60000, 2);
    expect(c.saldo).toBeCloseTo(90000, 2);
  });

  it("un saldo negativo es plata de la empresa en poder de la persona, y no suma al total a devolver", () => {
    const r = buildPersonLedger({
      entries: [
        { id: 90, company: "X", person: "Julio", date: "2026-03-01", kind: "debe", amount: 10000 },
        { id: 91, company: "X", person: "Julio", date: "2026-03-02", kind: "haber", amount: 25000 },
      ],
    });
    expect(cuenta(r, "Julio").saldo).toBeCloseTo(-15000, 2);
    expect(r.total).toBeCloseTo(0, 2);
    expect(r.aFavorTotal).toBeCloseTo(15000, 2);
  });

  it("respeta el corte por empresa", () => {
    const r = buildPersonLedger({
      invoices: [
        { id: 7, company: "BGA", paidByPerson: "Marta", invoiceDate: "2026-03-01", total: 100000 },
        { id: 8, company: "De raiz", paidByPerson: "Marta", invoiceDate: "2026-03-01", total: 200000 },
      ],
      companyScope: "BGA",
    });
    expect(cuenta(r, "Marta").saldo).toBeCloseTo(100000, 2);
  });

  it("ordena las cuentas por saldo y los movimientos del mas nuevo al mas viejo", () => {
    const r = buildPersonLedger({
      entries: [
        { id: 1, company: "X", person: "Chico", date: "2026-03-01", kind: "debe", amount: 1000 },
        { id: 2, company: "X", person: "Grande", date: "2026-03-01", kind: "debe", amount: 9000 },
        { id: 3, company: "X", person: "Grande", date: "2026-05-01", kind: "debe", amount: 1 },
      ],
    });
    expect(r.accounts.map((a) => a.person)).toEqual(["Grande", "Chico"]);
    expect(r.accounts[0].movements[0].date).toBe("2026-05-01");
  });
});
