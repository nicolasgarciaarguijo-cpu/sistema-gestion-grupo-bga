import { permisoDeRenglon, porQueNoSePuede } from "./calendarWriteback";

describe("permisoDeRenglon", () => {
  it("banco y cargas manuales se editan y se borran", () => {
    expect(permisoDeRenglon("bank-12")).toMatchObject({ editable: true, borrable: true });
    expect(permisoDeRenglon("financial-9")).toMatchObject({ editable: true, borrable: true });
  });

  it("comisiones y gastos de Costos: la planilla pide los mismos campos", () => {
    expect(permisoDeRenglon("comm-3")).toMatchObject({ editable: true, borrable: true });
    expect(permisoDeRenglon("cost-77")).toMatchObject({ editable: true, borrable: true });
  });

  it("el gasto de caja chica NO se opera acá: no vive en la planilla, lo que entra es el fondo", () => {
    const p = permisoDeRenglon("petty-cash-44");
    expect(p).toMatchObject({ editable: false, borrable: false });
    expect(p.motivo).toContain("rinde");
  });

  it("la asignación del fondo tampoco: se parte en varios renglones", () => {
    expect(permisoDeRenglon("petty-fund-9-blanco")).toMatchObject({ editable: false, borrable: false });
  });

  it("una factura de compra se borra pero no se edita: le faltan subtotal e IVA", () => {
    const p = permisoDeRenglon("purchase-invoice-8");
    expect(p.editable).toBe(false);
    expect(p.borrable).toBe(true);
    expect(p.donde).toBe("Compras");
  });

  it("purchase-invoice- no lo captura purchase-", () => {
    // Si el orden de los prefijos estuviera mal, una factura caeria en el aviso de compra y no se
    // podria borrar.
    expect(permisoDeRenglon("purchase-invoice-8").borrable).toBe(true);
    expect(permisoDeRenglon("purchase-8").borrable).toBe(false);
  });

  it("el aviso de compra y la cuota de un plan no son movimientos: ni editar ni borrar", () => {
    expect(permisoDeRenglon("purchase-8")).toMatchObject({ editable: false, borrable: false });
    expect(permisoDeRenglon("debt-2")).toMatchObject({ editable: false, borrable: false });
  });

  it("lo desconocido no se toca", () => {
    expect(permisoDeRenglon("otra-cosa-1")).toMatchObject({ editable: false, borrable: false });
    expect(permisoDeRenglon("")).toMatchObject({ editable: false, borrable: false });
  });
});

describe("porQueNoSePuede", () => {
  it("explica el motivo y dónde se hace", () => {
    const txt = porQueNoSePuede("purchase-invoice-8", "editar");
    expect(txt).toContain("subtotal e IVA");
    expect(txt).toContain("Compras");
  });

  it("no promete nada raro cuando no hay motivo", () => {
    expect(porQueNoSePuede("bank-1", "editar")).toBe("No se puede editar desde la planilla.");
  });
});
