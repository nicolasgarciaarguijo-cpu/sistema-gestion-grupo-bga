import { creditoIncompleto } from "./vatBalance";

// Nicolas, 17/11/2026: las facturas de compra se empezaron a cargar en serio en septiembre, asi que en
// agosto y antes el credito fiscal es 0 porque faltan las compras, no porque no hubiera. El "a pagar" de
// esos meses sale de mas: el tablero daria $9.255.138 de IVA de agosto de De Raiz y el aviso del contador
// dice $6.940.676. El mes lo avisa en vez de hacerle creer el numero.
describe("un mes de IVA con debito y sin credito", () => {
  it("se marca como incompleto", () => {
    expect(creditoIncompleto({ debito: 9255138, credito: 0 })).toBe(true);
  });

  it("con credito cargado no se marca", () => {
    expect(creditoIncompleto({ debito: 9255138, credito: 2314462 })).toBe(false);
    expect(creditoIncompleto({ debito: 100, credito: 1.5 })).toBe(false);
  });

  it("un mes sin ventas no se marca (no hay nada que controlar)", () => {
    expect(creditoIncompleto({ debito: 0, credito: 0 })).toBe(false);
    expect(creditoIncompleto({ debito: 0, credito: 50000 })).toBe(false);
  });
});
