import { bankEntryMissingInfo, bankEntryComplete } from "./bankAssignment";

// Renglón del calendario: desde 2026-08-27 es obligatorio para TODOS los movimientos, así que los
// casos que solo miran la asignación lo traen puesto para no mezclar dos cosas en una prueba.
const conRenglon = { conceptKey: "cobranzas" } as const;

describe("bankEntryMissingInfo", () => {
  it("sin asignar => falta asignación", () => {
    expect(bankEntryMissingInfo(conRenglon)).toEqual(["asignación"]);
    expect(bankEntryComplete(conRenglon)).toBe(false);
  });

  it("cobro sin trabajo/tercero ni B/N => falta las dos cosas", () => {
    expect(bankEntryMissingInfo({ ...conRenglon, assignedKind: "cobro" })).toEqual([
      "trabajo o tercero",
      "blanco/negro",
    ]);
  });

  it("cobro con trabajo y blanco => completo", () => {
    expect(
      bankEntryComplete({
        ...conRenglon,
        assignedKind: "cobro",
        assignedJobBudget: "3199",
        administration: "blanco",
      })
    ).toBe(true);
  });

  it("pago con tercero y negro => completo", () => {
    expect(
      bankEntryComplete({
        ...conRenglon,
        assignedKind: "pago",
        assignedParty: "DAC",
        administration: "negro",
      })
    ).toBe(true);
  });

  it("cobro con tercero pero sin B/N => falta blanco/negro", () => {
    expect(bankEntryMissingInfo({ ...conRenglon, assignedKind: "cobro", assignedParty: "X" })).toEqual([
      "blanco/negro",
    ]);
  });

  it("interno/aporte/impuesto/otro => con el tipo alcanza", () => {
    for (const k of ["interno", "aporte", "impuesto", "otro"] as const) {
      expect(bankEntryComplete({ ...conRenglon, assignedKind: k })).toBe(true);
    }
  });

  it("trabajo/tercero vacío (solo espacios) no cuenta", () => {
    expect(bankEntryMissingInfo({ ...conRenglon, assignedKind: "pago", assignedParty: "   " })).toContain(
      "trabajo o tercero"
    );
  });
});

describe("el renglón del calendario es obligatorio", () => {
  it("sin renglón, un movimiento perfecto en todo lo demás sigue con D", () => {
    const sinRenglon = {
      assignedKind: "pago" as const,
      assignedParty: "DAC",
      administration: "blanco" as const,
    };
    expect(bankEntryMissingInfo(sinRenglon)).toEqual(["renglón del calendario"]);
    expect(bankEntryComplete(sinRenglon)).toBe(false);
  });

  it("un movimiento sin nada avisa las dos cosas a la vez, no de a una", () => {
    expect(bankEntryMissingInfo({})).toEqual(["asignación", "renglón del calendario"]);
  });

  it("renglón vacío (solo espacios) no cuenta", () => {
    expect(bankEntryMissingInfo({ assignedKind: "otro", conceptKey: "   " })).toEqual([
      "renglón del calendario",
    ]);
  });
});
