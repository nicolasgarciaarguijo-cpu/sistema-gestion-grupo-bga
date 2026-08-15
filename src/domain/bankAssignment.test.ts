import { bankEntryMissingInfo, bankEntryComplete } from "./bankAssignment";

describe("bankEntryMissingInfo", () => {
  it("sin asignar => falta asignación", () => {
    expect(bankEntryMissingInfo({})).toEqual(["asignación"]);
    expect(bankEntryComplete({})).toBe(false);
  });

  it("cobro sin trabajo/tercero ni B/N => falta las dos cosas", () => {
    expect(bankEntryMissingInfo({ assignedKind: "cobro" })).toEqual([
      "trabajo o tercero",
      "blanco/negro",
    ]);
  });

  it("cobro con trabajo y blanco => completo", () => {
    expect(
      bankEntryComplete({ assignedKind: "cobro", assignedJobBudget: "3199", administration: "blanco" })
    ).toBe(true);
  });

  it("pago con tercero y negro => completo", () => {
    expect(
      bankEntryComplete({ assignedKind: "pago", assignedParty: "DAC", administration: "negro" })
    ).toBe(true);
  });

  it("cobro con tercero pero sin B/N => falta blanco/negro", () => {
    expect(bankEntryMissingInfo({ assignedKind: "cobro", assignedParty: "X" })).toEqual([
      "blanco/negro",
    ]);
  });

  it("interno/aporte/impuesto/otro => con el tipo alcanza", () => {
    for (const k of ["interno", "aporte", "impuesto", "otro"] as const) {
      expect(bankEntryComplete({ assignedKind: k })).toBe(true);
    }
  });

  it("trabajo/tercero vacío (solo espacios) no cuenta", () => {
    expect(bankEntryMissingInfo({ assignedKind: "pago", assignedParty: "   " })).toContain(
      "trabajo o tercero"
    );
  });
});
