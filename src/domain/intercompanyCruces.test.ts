import { girosDePlataEnCuentaAjena, posicionEntreEmpresas, summarizeIntercompany } from "./intercompany";

// Nicolas, 14/11/2026:
// 1) "el cobro cruzado que si figure en cuenta corriente": la plata que entra (o sale) de una cuenta de la
//    otra empresa es un prestamo entre las dos.
// 2) "necesito saber si el proximo prestamo implica plata en blanco para balancear todas esas facturas o es
//    mejor en negro": el saldo va partido en blanco y negro, y la factura solo cancela lo blanco.
const mov = (extra: any = {}) => ({
  refId: "cobro-1",
  company: "BGA",
  cuentaCompany: "DR",
  sentido: "entra" as const,
  date: "2026-11-14",
  amount: 1000,
  detalle: "Cliente X",
  origen: "Cobros",
  color: "blanco",
  ...extra,
});

const posicion = (transfers: any[], invoices?: any[]) => posicionEntreEmpresas(summarizeIntercompany({ transfers, invoices }).pairs);

describe("plata en la cuenta de la otra empresa", () => {
  it("un cobro de BGA que entra en la cuenta de De Raíz: De Raíz le debe esa plata", () => {
    const giros = girosDePlataEnCuentaAjena([mov()]);
    expect(giros).toHaveLength(1);
    expect(giros[0]).toMatchObject({ from: "BGA", to: "DR", amount: 1000, administration: "blanco" });
    expect(giros[0].text).toContain("Cobro en la cuenta de la otra empresa");
    expect(posicion(giros)).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 1000, blanco: 1000, negro: 0, facturado: 0 }]);
  });

  it("un pago de BGA que sale de la cuenta de De Raíz: BGA le debe a De Raíz", () => {
    const giros = girosDePlataEnCuentaAjena([mov({ refId: "gasto-2", sentido: "sale", amount: 400 })]);
    expect(giros[0]).toMatchObject({ from: "DR", to: "BGA", amount: 400 });
    expect(posicion(giros)).toEqual([{ deudor: "BGA", acreedor: "DR", saldo: 400, blanco: 400, negro: 0, facturado: 0 }]);
  });

  it("el color del movimiento es el color de la deuda", () => {
    expect(girosDePlataEnCuentaAjena([mov({ color: "negro" })])[0].administration).toBe("negro");
  });

  it("lo que no cruza de empresa, y los pases, no entran acá", () => {
    expect(girosDePlataEnCuentaAjena([mov({ cuentaCompany: "BGA" })])).toEqual([]);
    expect(girosDePlataEnCuentaAjena([mov({ sentido: "pase" })])).toEqual([]);
    expect(girosDePlataEnCuentaAjena([mov({ amount: 0 })])).toEqual([]);
  });

  it("devolver la plata del mismo color cancela la cuenta", () => {
    const ida = girosDePlataEnCuentaAjena([mov({ amount: 1000 })]);
    const vuelta = girosDePlataEnCuentaAjena([mov({ refId: "gasto-9", company: "DR", cuentaCompany: "BGA", amount: 1000 })]);
    expect(posicion([...ida, ...vuelta])).toEqual([]);
  });
});

describe("blanco y negro en la cuenta entre empresas", () => {
  const giro = (from: string, to: string, amount: number, administration: "blanco" | "negro") => ({
    id: 1,
    from,
    to,
    date: "2026-11-10",
    amount,
    text: "",
    declaresInvoice: false,
    administration,
  });

  it("el saldo se lee partido: cuánto en blanco y cuánto en negro", () => {
    expect(posicion([giro("BGA", "DR", 1000, "blanco"), giro("BGA", "DR", 500, "negro")])).toEqual([
      { deudor: "DR", acreedor: "BGA", saldo: 1500, blanco: 1000, negro: 500, facturado: 0 },
    ]);
  });

  it("la factura entre las dos cancela la plata BLANCA, no la negra", () => {
    // BGA le giró 1000 en blanco y 500 en negro; De Raíz le factura 1000: queda la deuda negra.
    expect(
      posicion([giro("BGA", "DR", 1000, "blanco"), giro("BGA", "DR", 500, "negro")], [{ from: "DR", to: "BGA", date: "2026-11-11", amount: 1000 }])
    ).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 500, blanco: 0, negro: 500, facturado: 1000 }]);
  });

  it("si factura de más, le sobra en blanco y sigue debiendo en negro", () => {
    expect(
      posicion([giro("BGA", "DR", 1000, "negro")], [{ from: "DR", to: "BGA", date: "2026-11-11", amount: 1500 }])
    ).toEqual([{ deudor: "BGA", acreedor: "DR", saldo: 500, blanco: 1500, negro: -1000, facturado: 1500 }]);
  });

  it("el giro sin color declarado cuenta como blanco", () => {
    const sinColor = { id: 2, from: "BGA", to: "DR", date: "2026-11-10", amount: 300, text: "", declaresInvoice: false };
    expect(posicion([sinColor])).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 300, blanco: 300, negro: 0, facturado: 0 }]);
  });
});
