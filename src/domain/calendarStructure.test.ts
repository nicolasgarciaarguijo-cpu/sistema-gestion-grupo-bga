import { esCobranzaReal, CALENDAR_SECTIONS, CALENDAR_ITEM_INDEX } from "./calendarStructure";

describe("esCobranzaReal", () => {
  it("una cobranza sin renglón es cobranza de trabajo", () => {
    expect(esCobranzaReal("cobranza", undefined)).toBe(true);
    expect(esCobranzaReal("cobranza", null)).toBe(true);
  });

  it("lo clasificado en el renglón de cobranzas también", () => {
    expect(esCobranzaReal("banco", "cobranzas")).toBe(true);
  });

  it("un PRÉSTAMO no es cobranza aunque se haya cargado como tal", () => {
    expect(esCobranzaReal("cobranza", "prestamo_nicolas")).toBe(false);
  });

  it("tampoco un rescate de inversión ni un ingreso vario", () => {
    expect(esCobranzaReal("cobranza", "rescate_plazo_fijo")).toBe(false);
    expect(esCobranzaReal("cobranza", "iv_reintegro_art")).toBe(false);
  });

  it("ni un renglón propio del usuario", () => {
    expect(esCobranzaReal("cobranza", "custom:prestamos:Sanchez")).toBe(false);
  });

  it("un pago nunca es cobranza", () => {
    expect(esCobranzaReal("pago", undefined)).toBe(false);
  });
});

describe("estructura de la planilla", () => {
  it("los renglones de PRÉSTAMOS existen y son ingreso", () => {
    const prestamos = CALENDAR_SECTIONS.find((s) => s.key === "prestamos");
    expect(prestamos?.dir).toBe("in");
    expect(CALENDAR_ITEM_INDEX["prestamo_nicolas"]).toEqual({
      sectionKey: "prestamos",
      label: "Préstamo Nicolás",
      dir: "in",
    });
  });
});
