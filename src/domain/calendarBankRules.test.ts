import { suggestCalendarConcept } from "./calendarBankRules";

describe("suggestCalendarConcept", () => {
  it("clasifica el impuesto Ley 25.413 (débito y crédito)", () => {
    expect(suggestCalendarConcept("Impuesto ley 25.413 debito 0,6%")).toBe("b_imp_ley_25413");
    expect(suggestCalendarConcept("Impuesto ley 25.413 credito 0,6%")).toBe("b_imp_ley_25413");
  });

  it("clasifica IMP.DB/CR bancarios por débito o crédito", () => {
    expect(suggestCalendarConcept("IMP.DB/CR BANCARIOS P/DEBITOS")).toBe("b_imp_debito");
    expect(suggestCalendarConcept("IMP.DB/CR BANCARIOS P/CREDITOS")).toBe("b_imp_credito");
  });

  it("distingue IVA general, 10,5% y percepción", () => {
    expect(suggestCalendarConcept("IVA ALICUOTA GENERAL")).toBe("b_iva_21");
    expect(suggestCalendarConcept("Iva 10,5% reg trans fisc ley 27743")).toBe("b_iva_105");
    expect(suggestCalendarConcept("Iva percep rg 2408 alic reducida")).toBe("b_iva_percepcion");
  });

  it("clasifica sellos, comisiones e intereses conocidos", () => {
    expect(suggestCalendarConcept("IMPUESTO A LOS SELLOS")).toBe("b_sellados");
    expect(suggestCalendarConcept("COMISION PAQUETE DE PRODUCTOS")).toBe("b_com_paquete");
    expect(suggestCalendarConcept("Cobro de interes por descubierto")).toBe("b_int_descubierto");
    expect(suggestCalendarConcept("INTERES DENTRO DE ACUERDO")).toBe("b_int_dentro_acuerdo");
  });

  it("clasifica tarjeta de crédito Visa", () => {
    expect(suggestCalendarConcept("TARJETA CREDITO VISA")).toBe("b_tarjeta_credito");
  });

  it("devuelve null en lo ambiguo (lo decide el usuario)", () => {
    expect(suggestCalendarConcept("PAGO DE SERVICIOS")).toBeNull();
    expect(suggestCalendarConcept("TRANSF. TERCEROS O/BCO. EBANK")).toBeNull();
    expect(suggestCalendarConcept("DEBITO P/ACREDITAC.DE SUELDOS")).toBeNull();
    expect(suggestCalendarConcept("CREDITO POR TRANSFERENCIA")).toBeNull();
    expect(suggestCalendarConcept("")).toBeNull();
  });
});
