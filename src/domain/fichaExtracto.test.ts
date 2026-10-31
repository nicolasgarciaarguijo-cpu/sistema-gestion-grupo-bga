import { fichasDeExtracto, type MovimientoF, type PagoBancoF, type ResumenTarjetaF } from "./fichaExtracto";

const mov = (m: Partial<MovimientoF>): MovimientoF => ({ id: 1, company: "BGA", bank: "Patagonia", date: "2026-11-03", concept: "TRANSF", movementType: "debito", amount: 100, balance: 900, ...m });

describe("ficha del extracto", () => {
  const resumenes: ResumenTarjetaF[] = [{ id: 50, company: "BGA", cardId: 9, closingDate: "2026-10-26", dueDate: "2026-11-05", totalArs: 300, nombre: "Visa Business" }];

  it("linkea, sugiere, manda los impuestos a comisiones y pone el tilde cuando esta todo", () => {
    const movs = [
      mov({ id: 1, balance: 900, amount: 100 }),
      mov({ id: 2, concept: "IMP.DB/CR BANCARIOS P/DEBITOS", amount: 6, balance: 894 }),
      mov({ id: 3, concept: "TARJETA CREDITO VISA", amount: 300, balance: 594, date: "2026-11-05" }),
      mov({ id: 4, concept: "TRANSFERENCIA RECIBIDA", movementType: "credito", amount: 1000, balance: 1594, date: "2026-11-06" }),
    ];
    const pagos: PagoBancoF[] = [{ id: 70, company: "BGA", date: "2026-11-02", amount: 100, supplier: "DAC", description: "", paymentMethod: "transferencia" }];
    const [f] = fichasDeExtracto(movs, pagos, resumenes);
    expect(f.mes).toBe("2026-11");
    expect(f.obligatorio).toBe(true);
    expect(f.movimientos.map((x) => x.estado)).toEqual(["sugerido", "comision", "sugerido", "pendiente"]);
    expect(f.movimientos[0].sugerencia).toEqual(expect.objectContaining({ tipo: "pago", pagoId: 70 }));
    expect(f.movimientos[2].sugerencia).toEqual(expect.objectContaining({ tipo: "resumen", statementId: 50 }));
    expect(f.comisionesArs).toBe(6);
    expect(f.completo).toBe(false);

    const linkeados = [
      { ...movs[0] },
      movs[1],
      { ...movs[2], assignedCardStatementId: 50 },
      { ...movs[3], assignedKind: "cobro", assignedJobBudget: "P-3450" },
    ];
    const [g] = fichasDeExtracto(linkeados, [{ ...pagos[0], bankEntryId: 1 }], resumenes);
    expect(g.movimientos.map((x) => x.estado)).toEqual(["linkeado", "comision", "linkeado", "linkeado"]);
    expect(g.completo).toBe(true);
  });

  it("un gasto desconocido saca el tilde; un pago sin pago cargado tampoco alcanza", () => {
    const [f] = fichasDeExtracto([mov({ desconocido: { firmante: "Nicolás", fecha: "2026-11-04", nota: "no lo reconozco" } })], [], []);
    expect(f.desconocidos).toBe(1);
    expect(f.completo).toBe(false);
    const [g] = fichasDeExtracto([mov({ assignedKind: "pago", assignedParty: "DAC" })], [], []);
    expect(g.movimientos[0].estado).toBe("pendiente");
  });

  it("si la cadena de saldos no cierra, no hay tilde", () => {
    const [f] = fichasDeExtracto(
      [mov({ id: 1, balance: 900, assignedKind: "interno" }), mov({ id: 2, balance: 700, amount: 100, assignedKind: "interno" })],
      [],
      []
    );
    expect(f.cadenaCierra).toBe(false);
    expect(f.completo).toBe(false);
  });

  it("una ficha por cuenta y mes; lo anterior al ejercicio nuevo no es obligatorio", () => {
    const fs = fichasDeExtracto([mov({ id: 1, date: "2026-10-30" }), mov({ id: 2, date: "2026-11-02", balance: 800 }), mov({ id: 3, bank: "Santander", balance: 5 })], [], []);
    expect(fs.map((f) => `${f.bank} ${f.mes} ${f.obligatorio}`)).toEqual(["Patagonia 2026-11 true", "Santander 2026-11 true", "Patagonia 2026-10 false"]);
  });
});
