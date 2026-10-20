import { precargaCobros } from "./precargaCobros";

// Trabajo de $10.000.000 neto, 60% facturado, 50% de anticipo: blanco 6M + IVA = 7,26M; negro 4M.
const base = {
  neto: 10_000_000,
  facturadoPct: 60,
  anticipoPct: 50,
  adicionalesBlancos: 0,
  valorACobrar: 11_260_000,
  cobradoBlanco: 0,
  cobradoNegro: 0,
  programadoBlanco: 0,
  programadoNegro: 0,
};

describe("precarga de cobros del trabajo", () => {
  it("el anticipo se reparte segun lo acordado: blanco con IVA, negro sin", () => {
    const p = precargaCobros(base);
    expect(p.anticipoBlanco).toBe(3_630_000);
    expect(p.anticipoNegro).toBe(2_000_000);
  });

  it("el saldo de cada circuito descuenta lo cobrado y lo ya programado", () => {
    const p = precargaCobros({ ...base, cobradoBlanco: 3_630_000, programadoNegro: 2_000_000 });
    expect(p.saldoBlanco).toBe(3_630_000);
    expect(p.saldoNegro).toBe(2_000_000);
    const sinNada = precargaCobros({ ...base, cobradoBlanco: 7_260_000, cobradoNegro: 4_000_000 });
    expect(sinNada).toMatchObject({ saldoBlanco: 0, saldoNegro: 0 });
  });

  it("todo facturado: no hay negro", () => {
    const p = precargaCobros({ ...base, facturadoPct: 100, valorACobrar: 12_100_000 });
    expect(p.anticipoNegro).toBe(0);
    expect(p.saldoNegro).toBe(0);
    expect(p.saldoBlanco).toBe(12_100_000);
  });
});
