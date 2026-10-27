import { anticipoPorCircuito, precargaCobros } from "./precargaCobros";

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
  it("anticipo 50% con 60% facturado: entra todo en el blanco (5M + IVA de lo facturado 1,26M), nada en negro", () => {
    const p = precargaCobros(base);
    expect(p.anticipoBlanco).toBe(6_260_000);
    expect(p.anticipoNegro).toBe(0);
  });

  it("caso 3430: neto 7.104.323,09, 50% facturado, 70% anticipo -> blanco 4.298.115,47 y negro 1.420.864,62", () => {
    const a = anticipoPorCircuito({ neto: 7_104_323.09, facturadoPct: 50, anticipoPct: 70 });
    expect(a.blanco).toBe(4_298_115.47);
    expect(a.negro).toBe(1_420_864.62);
    expect(a.total).toBe(5_718_980.09);
  });

  it("el saldo de cada circuito descuenta lo cobrado y lo ya programado", () => {
    const p = precargaCobros({ ...base, cobradoBlanco: 6_260_000, programadoNegro: 2_000_000 });
    expect(p.saldoBlanco).toBe(1_000_000);
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
