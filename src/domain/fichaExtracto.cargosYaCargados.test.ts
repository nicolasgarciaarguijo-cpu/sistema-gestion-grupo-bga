import { controlDeComisiones, fichasDeExtracto, type MovimientoF, type PagoBancoF } from "./fichaExtracto";

// Nicolas, 25/11/2026: "algo no esta funcionando bien, no esta reconociendo impuestos que ya existen y solicita cargar y
// linkearlos sin dejarme simplemente linkearlos". Los dos casos que estaban en la base ese dia.
const mov = (id: number, date: string, concept: string, amount: number, balance: number): MovimientoF => ({ id, company: "De Raiz", bank: "Patagonia", currency: "ARS", date, concept, movementType: "debito", amount, balance });
const pago = (id: number, date: string, amount: number, extra: Partial<PagoBancoF> = {}): PagoBancoF => ({ id, company: "De Raiz", date, amount, supplier: "Banco Patagonia", description: "Impuestos, tasas e intereses (cuenta)", paymentMethod: "debito", impuestoBanco: true, cuentaId: "banco|De Raiz|patagonia|ARS", ...extra });

describe("los cargos del banco que ya están cargados", () => {
  it("un impuesto cargado como factura del banco (sin la marca de impuesto) se sugiere para linkear, no para cargar de nuevo", () => {
    const f = fichasDeExtracto(
      [mov(1, "2026-11-24", "IMP.DB/CR BANCARIOS P/DEBITOS", 14961.18, 1000)],
      [pago(50, "2026-11-24", 14961.18, { impuestoBanco: false, paymentMethod: "transferencia", description: "IMP.DB/CR BANCARIOS P/DEBITOS · Nota de débito X" })],
      []
    )[0];
    expect(f.movimientos[0].estado).toBe("sugerido");
    const c = controlDeComisiones(f);
    expect(c.sugeridas).toHaveLength(1);
    expect(c.faltan).toHaveLength(0);
  });

  it("cada cargo se queda con el pago de su día: el del 30/10 no le saca el suyo al del 03/11", () => {
    const f = fichasDeExtracto(
      [mov(1, "2026-10-30", "COMISION PAQUETE DE PRODUCTOS", 60000, 5000), mov(2, "2026-11-03", "IMP.DB/CR BANCARIOS P/CREDITOS", 60000, 4000)],
      [pago(50, "2026-11-03", 60000)],
      []
    );
    const todos = f.flatMap((x) => x.movimientos);
    const del3 = todos.find((x) => x.mov.id === 2)!;
    const del30 = todos.find((x) => x.mov.id === 1)!;
    expect(del3.estado).toBe("sugerido");
    expect((del3.sugerencia as any).pagoId).toBe(50);
    expect(del30.estado).toBe("comision");
  });

  it("entre un pago marcado como impuesto y uno común del mismo día, gana el marcado", () => {
    const f = fichasDeExtracto(
      [mov(1, "2026-11-16", "IMP.DB/CR BANCARIOS P/DEBITOS", 500, 1000)],
      [pago(50, "2026-11-16", 500, { impuestoBanco: false, supplier: "Proveedor", description: "Factura" }), pago(51, "2026-11-16", 500)],
      []
    )[0];
    expect((f.movimientos[0].sugerencia as any).pagoId).toBe(51);
  });

  it("no reserva pagos de otra cuenta ni en efectivo", () => {
    const m = [mov(1, "2026-11-16", "IMP.DB/CR BANCARIOS P/DEBITOS", 500, 1000)];
    expect(fichasDeExtracto(m, [pago(50, "2026-11-16", 500, { cuentaId: "banco|BGA|patagonia|ARS", company: "BGA" })], [])[0].movimientos[0].estado).toBe("comision");
    expect(fichasDeExtracto(m, [pago(50, "2026-11-16", 500, { paymentMethod: "efectivo" })], [])[0].movimientos[0].estado).toBe("comision");
  });
});
