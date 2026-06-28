import {
  buildBudgetNumberFromParts,
  getNextBudgetNumber,
  parseLeadDays,
  parsePaymentPercents,
  buildDeliveryDateFromTerm,
} from "./budgetTerms";

describe("buildBudgetNumberFromParts", () => {
  it("rellena con ceros al ancho dado", () => {
    expect(buildBudgetNumberFromParts("P-", 8, 4)).toBe("P-0008");
  });
});

describe("getNextBudgetNumber", () => {
  it("incrementa respetando prefijo y ancho", () => {
    expect(getNextBudgetNumber(["P-0007"], "P-0007")).toBe("P-0008");
  });
  it("toma el maximo existente con el mismo prefijo", () => {
    expect(getNextBudgetNumber(["P-0003", "P-0010", "P-0005"], "P-0003")).toBe("P-0011");
  });
  it("ignora numeros de otro prefijo", () => {
    expect(getNextBudgetNumber(["X-9999"], "P-0001")).toBe("P-0002");
  });
});

describe("parseLeadDays", () => {
  it("toma el primer numero del texto", () => {
    expect(parseLeadDays("30 dias habiles")).toBe(30);
    expect(parseLeadDays("entrega 15/20")).toBe(15);
  });
  it("0 si no hay numero", () => expect(parseLeadDays("a convenir")).toBe(0));
});

describe("parsePaymentPercents", () => {
  it("anticipo y saldo explicitos", () => {
    expect(parsePaymentPercents("50% anticipo, 50% contra entrega")).toEqual({ anticipoPct: 50, saldoPct: 50 });
  });
  it("solo anticipo: el saldo completa a 100", () => {
    expect(parsePaymentPercents("30% de anticipo")).toEqual({ anticipoPct: 30, saldoPct: 70 });
  });
  it("sin porcentajes: 0 anticipo, 100 saldo", () => {
    expect(parsePaymentPercents("contado")).toEqual({ anticipoPct: 0, saldoPct: 100 });
  });
});

describe("buildDeliveryDateFromTerm", () => {
  it("suma los dias de plazo a la fecha base", () => {
    expect(buildDeliveryDateFromTerm("2026-06-01", "30 dias")).toBe("2026-07-01");
  });
  it("vacio si falta fecha o plazo", () => {
    expect(buildDeliveryDateFromTerm("", "30 dias")).toBe("");
    expect(buildDeliveryDateFromTerm("2026-06-01", "a convenir")).toBe("");
  });
});
