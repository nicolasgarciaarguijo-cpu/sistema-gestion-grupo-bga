import { conteoBlanqueo, type MovFisco } from "./faltaFactura";

const DR = "De raiz s.r.l";
const EJ = { desde: "2025-11-01", hasta: "2026-10-31" };
const mov = (tipo: MovFisco["tipo"], amount: number, extra: Partial<MovFisco> = {}): MovFisco => ({
  company: DR, date: "2026-05-10", amount, tipo, ...extra,
});

describe("conteo de blanqueo frente al IVA", () => {
  it("el ejemplo: depositar $1.210.000 negro pide IVA $210.000; balancear lo baja", () => {
    const solo = conteoBlanqueo({ company: DR, ...EJ, movimientos: [mov("deposito_negro", 1210000)] });
    expect(solo).toMatchObject({ sube: 1210000, saldo: 1210000, faltaFacturar: 1210000, ivaFaltante: 210000 });

    const balanceado = conteoBlanqueo({
      company: DR,
      ...EJ,
      movimientos: [mov("deposito_negro", 1210000), mov("blanco_a_negro", 605000), mov("caja_negro_con_factura", 363000)],
    });
    expect(balanceado).toMatchObject({ baja: 968000, saldo: 242000, ivaFaltante: 42000 });
  });

  it("prestamo o aporte en negro que entra al banco tambien sube", () => {
    const c = conteoBlanqueo({ company: DR, ...EJ, movimientos: [mov("prestamo_negro", 121000)] });
    expect(c.ivaFaltante).toBe(21000);
  });

  it("todo lo que balancea baja: blanco a negro, caja B→N, caja N→B y facturas pagadas en negro", () => {
    const c = conteoBlanqueo({
      company: DR,
      ...EJ,
      movimientos: [mov("blanco_a_negro", 1), mov("caja_blanco_sin_factura", 2), mov("caja_negro_con_factura", 3), mov("factura_pagada_negro", 4)],
    });
    expect(c).toMatchObject({ sube: 0, baja: 10, saldo: -10, faltaFacturar: 0, ivaFaltante: 0, margen: 10 });
  });

  it("arranca de cero cada ejercicio fiscal y no mezcla empresas", () => {
    const c = conteoBlanqueo({
      company: DR,
      ...EJ,
      movimientos: [mov("deposito_negro", 500, { date: "2025-10-31" }), mov("deposito_negro", 700, { company: "BGA" })],
    });
    expect(c.sube).toBe(0);
  });
});
