import { buildLoanLines, lenderFromLabel, sameLender, type CalendarLoan } from "./loanLines";
import type { CapitalEntry } from "./contributions";

const loan = (over: Partial<CalendarLoan>): CalendarLoan => ({
  id: "bank-1",
  company: "BGA",
  date: "2026-08-10",
  amount: 5_000_000,
  lender: "Nicolás",
  color: "blanco",
  ...over,
});

const asiento = (over: Partial<CapitalEntry>): CapitalEntry => ({
  id: 1,
  company: "BGA" as any,
  date: "2026-08-12",
  origin: "Nicolás",
  kind: "prestamo",
  direction: "recibido",
  color: "blanco",
  amount: 5_000_000,
  notes: "",
  ...over,
});

describe("lenderFromLabel", () => {
  it("saca el prefijo del renglón y deja el nombre", () => {
    expect(lenderFromLabel("Préstamo Nicolás")).toBe("Nicolás");
    expect(lenderFromLabel("Préstamo de Gustavo")).toBe("Gustavo");
    expect(lenderFromLabel("Préstamo bancario")).toBe("Bancario");
  });
  it("un renglón que no empieza con Préstamo queda como está", () => {
    expect(lenderFromLabel("BGA Patagonia")).toBe("BGA Patagonia");
  });
});

describe("sameLender", () => {
  it("ignora acentos, puntos y mayúsculas", () => {
    expect(sameLender("NICOLAS", "Nicolás")).toBe(true);
    expect(sameLender("Banco Patagonia", "banco patagonia")).toBe(true);
  });
  it("no confunde dos prestamistas distintos", () => {
    expect(sameLender("Nicolás", "Gustavo")).toBe(false);
  });
});

describe("buildLoanLines", () => {
  it("arma una línea por prestamista con el nombre", () => {
    const r = buildLoanLines(
      [
        loan({ id: "bank-1", lender: "Nicolás", amount: 5_000_000 }),
        loan({ id: "bank-2", lender: "Gustavo", amount: 8_000_000 }),
        loan({ id: "bank-3", lender: "Nicolás", amount: 2_000_000, date: "2026-08-20" }),
      ],
      []
    );
    expect(r.map((l) => l.lender)).toEqual(["Gustavo", "Nicolás"]); // ordena por monto
    const nico = r.find((l) => l.lender === "Nicolás")!;
    expect(nico.recibido).toBe(7_000_000);
    expect(nico.sinAsentar).toBe(7_000_000);
    expect(nico.movimientos).toHaveLength(2);
  });

  it("no cuenta dos veces lo que ya estaba asentado a mano", () => {
    const r = buildLoanLines([loan({})], [asiento({})]);
    expect(r[0].recibido).toBe(5_000_000);
    expect(r[0].asentado).toBe(5_000_000);
    expect(r[0].sinAsentar).toBe(0);
    expect(r[0].movimientos[0].asentado).toBe(true);
  });

  it("un asiento tapa UN solo movimiento (dos préstamos iguales no quedan los dos asentados)", () => {
    const r = buildLoanLines(
      [loan({ id: "bank-1" }), loan({ id: "bank-2", date: "2026-08-11" })],
      [asiento({})]
    );
    expect(r[0].asentado).toBe(5_000_000);
    expect(r[0].sinAsentar).toBe(5_000_000);
  });

  it("un asiento de otro prestamista o de otro monto no tapa nada", () => {
    expect(buildLoanLines([loan({})], [asiento({ origin: "Gustavo" })])[0].sinAsentar).toBe(5_000_000);
    expect(buildLoanLines([loan({})], [asiento({ amount: 4_000_000 })])[0].sinAsentar).toBe(5_000_000);
  });

  it("un asiento cargado muchos días después no tapa el movimiento", () => {
    expect(buildLoanLines([loan({})], [asiento({ date: "2026-10-30" })])[0].sinAsentar).toBe(5_000_000);
  });

  it("una DEVOLUCIÓN no tapa un préstamo que entró", () => {
    expect(buildLoanLines([loan({})], [asiento({ direction: "devuelto" })])[0].sinAsentar).toBe(5_000_000);
  });

  it("un aporte tampoco tapa un préstamo", () => {
    expect(buildLoanLines([loan({})], [asiento({ kind: "aporte" })])[0].sinAsentar).toBe(5_000_000);
  });

  it("el asiento de la otra empresa no tapa el movimiento", () => {
    expect(buildLoanLines([loan({})], [asiento({ company: "De Raíz" as any })])[0].sinAsentar).toBe(
      5_000_000
    );
  });

  it("sin préstamos no arma ninguna línea", () => {
    expect(buildLoanLines([], [asiento({})])).toEqual([]);
  });
});
