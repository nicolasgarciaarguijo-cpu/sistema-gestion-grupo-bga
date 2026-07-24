import {
  money,
  pct,
  formatAmountInput,
  parseAmountInput,
  formatAmountTyping,
  formatDateDisplay,
  localDateKey,
  localMonthKey,
  todayIso,
  normalizeCompanyText,
} from "./format";

describe("money", () => {
  it("formatea ARS con separadores es-AR", () => {
    //   = espacio duro que usa Intl entre el simbolo y el numero
    expect(money(1234.5)).toBe("$ 1.234,50");
  });
  it("cae a 0 ante valores no finitos", () => {
    expect(money(NaN)).toBe("$ 0,00");
    expect(money(Infinity)).toBe("$ 0,00");
  });
  it("formatea USD con simbolo U$S", () => {
    expect(money(1234.5, "USD")).toBe("U$S 1.234,50");
  });
  it("ARS por defecto (sin pasar moneda)", () => {
    expect(money(1000)).toBe("$ 1.000,00");
  });
});

describe("inputs de monto", () => {
  it("formatAmountInput: numero -> miles con punto; 0 -> vacio", () => {
    expect(formatAmountInput(1000000)).toBe("1.000.000");
    expect(formatAmountInput(1234.5)).toBe("1.234,5");
    expect(formatAmountInput(0)).toBe("");
    expect(formatAmountInput(NaN)).toBe("");
  });
  it("parseAmountInput: texto es-AR -> numero", () => {
    expect(parseAmountInput("1.000.000")).toBe(1000000);
    expect(parseAmountInput("1.234,50")).toBe(1234.5);
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("abc")).toBe(0);
  });
  it("parse(format(x)) vuelve al mismo numero", () => {
    for (const n of [0, 5, 1000, 10500000, 1234.56]) {
      expect(parseAmountInput(formatAmountInput(n))).toBe(n);
    }
  });
  it("formatAmountTyping: pone miles y conserva la coma en progreso", () => {
    expect(formatAmountTyping("1000000")).toBe("1.000.000");
    expect(formatAmountTyping("1000000,")).toBe("1.000.000,");
    expect(formatAmountTyping("1000000,5")).toBe("1.000.000,5");
    expect(formatAmountTyping("")).toBe("");
  });
});

describe("pct", () => {
  it("muestra 2 decimales con signo %", () => {
    expect(pct(21)).toBe("21.00%");
    expect(pct(10.5)).toBe("10.50%");
  });
  it("cae a 0 ante no finitos", () => {
    expect(pct(NaN)).toBe("0.00%");
  });
});

describe("formatDateDisplay", () => {
  it("convierte ISO YYYY-MM-DD a DD-MM-YYYY", () => {
    expect(formatDateDisplay("2026-06-16")).toBe("16-06-2026");
  });
  it("devuelve - si esta vacio", () => {
    expect(formatDateDisplay("")).toBe("-");
  });
  it("devuelve el texto tal cual si no tiene 3 partes", () => {
    expect(formatDateDisplay("2026-06")).toBe("2026-06");
  });
});

describe("localDateKey / localMonthKey", () => {
  it("arma la clave de fecha local con padding", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("arma la clave de mes local", () => {
    expect(localMonthKey(new Date(2026, 8, 1))).toBe("2026-09");
  });
});

describe("todayIso", () => {
  it("coincide con localDateKey de hoy", () => {
    expect(todayIso()).toBe(localDateKey(new Date()));
  });
});

describe("normalizeCompanyText", () => {
  it("saca acentos, baja a minuscula y colapsa no alfanumericos", () => {
    expect(normalizeCompanyText("De Raíz S.R.L.")).toBe("de raiz s r l");
  });
  it("tolera vacio", () => {
    expect(normalizeCompanyText("")).toBe("");
  });
});
