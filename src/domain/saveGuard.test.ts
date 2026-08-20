import { fieldsThatWouldBeEmptied, describeEmptied } from "./saveGuard";

describe("fieldsThatWouldBeEmptied", () => {
  it("detecta el caso del 20/08: la sesion nueva escribe vacio sobre datos buenos", () => {
    const r = fieldsThatWouldBeEmptied(
      { bankStatementEntries: [], financialItems: [] },
      { bankStatementEntries: [{ id: 1 }, { id: 2 }], financialItems: [{ id: 9 }] }
    );
    expect(r).toEqual([
      { field: "bankStatementEntries", remoto: 2 },
      { field: "financialItems", remoto: 1 },
    ]);
  });

  it("no frena cuando traemos datos", () => {
    expect(
      fieldsThatWouldBeEmptied({ bankStatementEntries: [{ id: 1 }] }, { bankStatementEntries: [{ id: 2 }] })
    ).toEqual([]);
  });

  it("no frena si en la base tambien esta vacio (no hay nada que perder)", () => {
    expect(fieldsThatWouldBeEmptied({ debtPlans: [] }, { debtPlans: [] })).toEqual([]);
  });

  it("no frena por un campo que no estamos escribiendo", () => {
    expect(fieldsThatWouldBeEmptied({ otroCampo: [] }, { bankStatementEntries: [{ id: 1 }] })).toEqual([]);
  });

  it("ignora lo que no es array (configuracion, textos, numeros)", () => {
    expect(
      fieldsThatWouldBeEmptied(
        { calendarRowConfig: {}, titulo: "", cuenta: 0 },
        { calendarRowConfig: { labels: { a: "b" } }, titulo: "algo", cuenta: 5 }
      )
    ).toEqual([]);
  });

  it("tolera que no haya fila en la base o que venga basura", () => {
    expect(fieldsThatWouldBeEmptied({ a: [] }, null)).toEqual([]);
    expect(fieldsThatWouldBeEmptied(null, { a: [{ id: 1 }] })).toEqual([]);
  });

  it("describeEmptied arma el detalle para el aviso", () => {
    expect(describeEmptied([{ field: "purchaseInvoices", remoto: 12 }])).toBe("purchaseInvoices: 12");
  });
});
