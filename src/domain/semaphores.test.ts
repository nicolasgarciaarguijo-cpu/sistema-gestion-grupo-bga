import {
  daysUntilDate,
  getDateSemaphore,
  getJobSemaphore,
  getBudgetSemaphore,
  getStockSemaphore,
  getClientSemaphore,
} from "./semaphores";

// Fecha ISO (yyyy-mm-dd) a N dias de hoy, para tests deterministicos.
const isoOffset = (days: number): string => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

describe("daysUntilDate", () => {
  it("hoy = 0", () => expect(daysUntilDate(isoOffset(0))).toBe(0));
  it("futuro positivo", () => expect(daysUntilDate(isoOffset(5))).toBe(5));
  it("pasado negativo", () => expect(daysUntilDate(isoOffset(-3))).toBe(-3));
  it("fecha vacia o invalida = null", () => {
    expect(daysUntilDate("")).toBeNull();
    expect(daysUntilDate("no-es-fecha")).toBeNull();
  });
});

describe("getDateSemaphore", () => {
  it("done siempre es verde", () => expect(getDateSemaphore(isoOffset(-100), true).level).toBe("verde"));
  it("sin fecha = amarillo", () => expect(getDateSemaphore("", false).level).toBe("amarillo"));
  it("vencido = rojo", () => expect(getDateSemaphore(isoOffset(-1), false).level).toBe("rojo"));
  it("vence pronto (<=7d) = amarillo", () => expect(getDateSemaphore(isoOffset(3), false).level).toBe("amarillo"));
  it("con margen = verde", () => expect(getDateSemaphore(isoOffset(30), false).level).toBe("verde"));
});

describe("getJobSemaphore", () => {
  it("sin fecha de inicio = rojo", () => expect(getJobSemaphore({}).level).toBe("rojo"));
  it("finalizado = verde", () => expect(getJobSemaphore({ startDate: isoOffset(-5), executionStatus: "finalizado" }).level).toBe("verde"));
  it("en curso = amarillo", () => expect(getJobSemaphore({ startDate: isoOffset(-5), executionStatus: "en_curso" }).level).toBe("amarillo"));
});

describe("getBudgetSemaphore", () => {
  it("aprobado = verde", () => expect(getBudgetSemaphore({ status: "aprobado" }).level).toBe("verde"));
  it("no aprobado = rojo", () => expect(getBudgetSemaphore({ status: "no_aprobado" }).level).toBe("rojo"));
  it("en borrador vigente = amarillo", () => expect(getBudgetSemaphore({ status: "pendiente" }).level).toBe("amarillo"));
});

describe("getStockSemaphore", () => {
  it("cubierto = verde", () => expect(getStockSemaphore({ available: 10, missing: 0 }).level).toBe("verde"));
  it("parcial = amarillo", () => expect(getStockSemaphore({ available: 3, missing: 5 }).level).toBe("amarillo"));
  it("faltante total = rojo", () => expect(getStockSemaphore({ available: 0, missing: 5 }).level).toBe("rojo"));
});

describe("getClientSemaphore", () => {
  it("sin CUIT ni contacto = rojo", () => expect(getClientSemaphore({}).level).toBe("rojo"));
  it("solo uno = amarillo", () => expect(getClientSemaphore({ clientTaxId: "20-1-3" }).level).toBe("amarillo"));
  it("completos = verde", () => expect(getClientSemaphore({ clientTaxId: "20-1-3", contactPhone: "11" }).level).toBe("verde"));
});
