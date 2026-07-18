import { summarizeContributions, type CapitalEntry } from "./contributions";

const base = {
  company: "De raiz s.r.l" as CapitalEntry["company"],
  date: "2025-11-01",
  notes: "",
};

const entry = (e: Partial<CapitalEntry>): CapitalEntry => ({
  id: Math.floor(Math.random() * 1e9),
  origin: "Gustavo",
  kind: "aporte",
  direction: "recibido",
  color: "blanco",
  amount: 0,
  ...base,
  ...e,
});

describe("summarizeContributions", () => {
  it("suma aportes por color y no los mezcla con préstamos", () => {
    const r = summarizeContributions([
      entry({ kind: "aporte", color: "blanco", amount: 100000 }),
      entry({ kind: "aporte", color: "negro", amount: 50000 }),
      entry({ kind: "prestamo", color: "blanco", amount: 200000 }),
    ]);
    expect(r.aportes).toMatchObject({ blanco: 100000, negro: 50000, total: 150000 });
    expect(r.prestamosPendientes.total).toBe(200000);
  });

  it("préstamo devuelto baja la deuda viva", () => {
    const r = summarizeContributions([
      entry({ kind: "prestamo", direction: "recibido", amount: 300000 }),
      entry({ kind: "prestamo", direction: "devuelto", amount: 120000 }),
    ]);
    expect(r.prestamosRecibidos).toBe(300000);
    expect(r.prestamosDevueltos).toBe(120000);
    expect(r.prestamosPendientes.total).toBe(180000);
  });

  it("el aporte no se descuenta como deuda (queda como capital)", () => {
    const r = summarizeContributions([entry({ kind: "aporte", amount: 500000 })]);
    expect(r.aportes.total).toBe(500000);
    expect(r.prestamosPendientes.total).toBe(0);
  });

  it("totalRecibido junta toda la plata que entró (aporte + préstamo)", () => {
    const r = summarizeContributions([
      entry({ kind: "aporte", direction: "recibido", amount: 100000 }),
      entry({ kind: "prestamo", direction: "recibido", amount: 200000 }),
      entry({ kind: "prestamo", direction: "devuelto", amount: 50000 }),
    ]);
    expect(r.totalRecibido).toBe(300000); // devuelto no cuenta como entrada
  });

  it("agrupa por origen: quién puso cuánto", () => {
    const r = summarizeContributions([
      entry({ origin: "Gustavo", kind: "aporte", amount: 100000 }),
      entry({ origin: "Nicolás", kind: "prestamo", amount: 300000 }),
      entry({ origin: "Gustavo", kind: "prestamo", amount: 50000 }),
    ]);
    const gustavo = r.byOrigin.find((o) => o.origin === "Gustavo")!;
    const nicolas = r.byOrigin.find((o) => o.origin === "Nicolás")!;
    expect(gustavo).toMatchObject({ aporte: 100000, prestamoPendiente: 50000, total: 150000 });
    expect(nicolas.prestamoPendiente).toBe(300000);
    expect(r.byOrigin[0].origin).toBe("Nicolás"); // ordenado por total desc
  });

  it("el USD congelado es referencia aparte, no se suma con pesos", () => {
    const r = summarizeContributions([
      entry({ kind: "prestamo", amount: 1083700, usdValue: 1000 }),
      entry({ kind: "prestamo", direction: "devuelto", amount: 500000, usdValue: 400 }),
    ]);
    expect(r.usdReference).toBe(600); // 1000 − 400
    expect(r.prestamosPendientes.total).toBe(583700); // pesos, aparte
  });

  it("origen vacío cae en 'Sin origen'", () => {
    const r = summarizeContributions([entry({ origin: "", kind: "aporte", amount: 1000 })]);
    expect(r.byOrigin[0].origin).toBe("Sin origen");
  });

  it("registro vacío da todo en cero", () => {
    const r = summarizeContributions([]);
    expect(r.aportes.total).toBe(0);
    expect(r.prestamosPendientes.total).toBe(0);
    expect(r.count).toBe(0);
    expect(r.byOrigin).toEqual([]);
  });
});
