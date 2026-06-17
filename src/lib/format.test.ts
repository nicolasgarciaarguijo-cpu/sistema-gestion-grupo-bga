import {
  money,
  pct,
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
