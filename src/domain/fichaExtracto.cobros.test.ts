import { fichasDeExtracto, type CobroF, type MovimientoF } from "./fichaExtracto";

// Nicolas, 25/11/2026: "que el credito de banco se linkee con cada cobro". El credito del extracto se une con el cobro (o
// los cobros) cargados en los trabajos. Solo control: el cobro sigue en su trabajo y no se mueve plata.
const credito: MovimientoF = { id: 1, company: "BGA", bank: "Patagonia", currency: "ARS", date: "2026-11-16", concept: "CREDITO POR TRANSFERENCIA", movementType: "credito", amount: 300, balance: 1300 };
const cobro = (id: number, amount: number, extra: Partial<CobroF> = {}): CobroF => ({ id, company: "BGA", date: "2026-11-16", amount, trabajo: "3394", cliente: "Contract Rent", metodo: "transferencia", cuentaId: "banco|BGA|patagonia|ARS", moneda: "ARS", ...extra });
const ficha = (cobros: CobroF[], mov: MovimientoF = credito) => fichasDeExtracto([mov], [], [], [], cobros)[0].movimientos[0];

describe("el crédito del banco se linkea con cada cobro", () => {
  it("linkeado con su cobro, dice de qué trabajo y cliente es", () => {
    const m = ficha([cobro(10, 300, { bankEntryId: 1 })]);
    expect(m.estado).toBe("linkeado");
    expect(m.detalle).toBe("Cobro cargado · 3394 · Contract Rent");
  });

  it("una transferencia que paga dos facturas: dos cobros que suman", () => {
    const m = ficha([cobro(10, 100, { bankEntryId: 1 }), cobro(11, 200, { bankEntryId: 1, trabajo: "3395" })]);
    expect(m.estado).toBe("linkeado");
    expect(m.detalle).toContain("2 cobros cargados");
    expect(m.detalle).not.toContain("⚠");
  });

  it("si lo linkeado no suma el crédito, lo avisa", () => {
    expect(ficha([cobro(10, 100, { bankEntryId: 1 })]).detalle).toContain("⚠ suman 100");
  });

  it("sugiere el cobro del mismo importe", () => {
    const m = ficha([cobro(10, 300), cobro(11, 50)]);
    expect(m.estado).toBe("sugerido");
    expect(m.sugerencia).toEqual(expect.objectContaining({ tipo: "cobros", cobroIds: [10] }));
  });

  it("sugiere los cobros del mismo cliente que suman el importe", () => {
    const m = ficha([cobro(10, 100), cobro(11, 200, { trabajo: "3395" }), cobro(12, 60, { cliente: "Otro" })]);
    expect((m.sugerencia as any).cobroIds.slice().sort()).toEqual([10, 11]);
  });

  it("no ofrece cobros en efectivo, de otra cuenta, de otra empresa ni ya linkeados", () => {
    expect(ficha([cobro(10, 300, { metodo: "efectivo" })]).estado).toBe("pendiente");
    expect(ficha([cobro(10, 300, { cuentaId: "banco|BGA|santander|ARS" })]).estado).toBe("pendiente");
    expect(ficha([cobro(10, 300, { company: "De Raiz", cuentaId: "banco|De Raiz|patagonia|ARS" })]).estado).toBe("pendiente");
    expect(ficha([cobro(10, 300, { bankEntryId: 99 })]).estado).toBe("pendiente");
  });

  it("el link viejo con el trabajo (sin cobro) sigue valiendo", () => {
    const m = ficha([], { ...credito, assignedKind: "cobro", assignedJobBudget: "3394", assignedParty: "Contract Rent" });
    expect(m.estado).toBe("linkeado");
    expect(m.detalle).toBe("Cobro · 3394 · Contract Rent");
  });
});
