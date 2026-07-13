import {
  getFiscalYearStartMonth,
  fiscalYearBounds,
  currentFiscalStartYear,
  monthBounds,
  isIsoInRange,
  DEFAULT_FISCAL_START_MONTH,
} from "./fiscalYear";

describe("getFiscalYearStartMonth", () => {
  it("default noviembre si no esta configurado", () => {
    expect(getFiscalYearStartMonth(undefined)).toBe(11);
    expect(getFiscalYearStartMonth({})).toBe(DEFAULT_FISCAL_START_MONTH);
  });
  it("usa el valor configurado", () => {
    expect(getFiscalYearStartMonth({ fiscalYearStartMonth: 1 })).toBe(1);
    expect(getFiscalYearStartMonth({ fiscalYearStartMonth: 7 })).toBe(7);
  });
  it("ignora valores invalidos", () => {
    expect(getFiscalYearStartMonth({ fiscalYearStartMonth: 0 })).toBe(11);
    expect(getFiscalYearStartMonth({ fiscalYearStartMonth: 13 })).toBe(11);
  });
});

describe("fiscalYearBounds", () => {
  it("octubre a septiembre", () => {
    expect(fiscalYearBounds(10, 2025)).toEqual({ startIso: "2025-10-01", endIso: "2026-09-30" });
  });
  it("enero a diciembre (ano calendario)", () => {
    expect(fiscalYearBounds(1, 2026)).toEqual({ startIso: "2026-01-01", endIso: "2026-12-31" });
  });
  it("julio a junio", () => {
    expect(fiscalYearBounds(7, 2025)).toEqual({ startIso: "2025-07-01", endIso: "2026-06-30" });
  });
});

describe("currentFiscalStartYear", () => {
  it("octubre: en junio 2026 el ano fiscal arranco en 2025", () => {
    expect(currentFiscalStartYear(10, new Date(2026, 5, 15))).toBe(2025);
  });
  it("octubre: en noviembre 2026 el ano fiscal arranco en 2026", () => {
    expect(currentFiscalStartYear(10, new Date(2026, 10, 5))).toBe(2026);
  });
  it("octubre: justo en octubre ya es el nuevo ano fiscal", () => {
    expect(currentFiscalStartYear(10, new Date(2026, 9, 1))).toBe(2026);
  });
});

describe("monthBounds", () => {
  it("limites de un mes", () => {
    expect(monthBounds("2026-02")).toEqual({ startIso: "2026-02-01", endIso: "2026-02-28" });
    expect(monthBounds("2026-12")).toEqual({ startIso: "2026-12-01", endIso: "2026-12-31" });
  });
});

describe("isIsoInRange", () => {
  it("dentro y en los bordes (inclusivo)", () => {
    expect(isIsoInRange("2025-10-01", "2025-10-01", "2026-09-30")).toBe(true);
    expect(isIsoInRange("2026-09-30", "2025-10-01", "2026-09-30")).toBe(true);
    expect(isIsoInRange("2026-01-15", "2025-10-01", "2026-09-30")).toBe(true);
  });
  it("fuera de rango", () => {
    expect(isIsoInRange("2025-09-30", "2025-10-01", "2026-09-30")).toBe(false);
    expect(isIsoInRange("2026-10-01", "2025-10-01", "2026-09-30")).toBe(false);
  });
  it("fecha vacia o invalida = false", () => {
    expect(isIsoInRange("", "2025-10-01", "2026-09-30")).toBe(false);
    expect(isIsoInRange("no", "2025-10-01", "2026-09-30")).toBe(false);
  });
});
