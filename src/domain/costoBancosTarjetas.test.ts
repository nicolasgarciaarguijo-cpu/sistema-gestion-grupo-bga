import { categoriaDeLineaTarjeta, categoriaDeRenglonBancario, costoBancosYTarjetas, debitoSospechoso } from "./costoBancosTarjetas";

describe("categorías", () => {
  it("renglones del banco", () => {
    expect(categoriaDeRenglonBancario("b_com_paquete")).toBe("comisiones");
    expect(categoriaDeRenglonBancario("b_imp_ley_25413")).toBe("impuestos");
    expect(categoriaDeRenglonBancario("b_iva_21")).toBe("impuestos");
    expect(categoriaDeRenglonBancario("b_int_descubierto")).toBe("intereses");
    expect(categoriaDeRenglonBancario("b_tarjeta_credito")).toBeNull();
    expect(categoriaDeRenglonBancario("b_credito_1")).toBeNull();
    expect(categoriaDeRenglonBancario("cm_materiales")).toBeNull();
  });
  it("líneas del resumen de tarjeta (textos reales)", () => {
    expect(categoriaDeLineaTarjeta("IMPUESTO DE SELLOS $")).toBe("impuestos");
    expect(categoriaDeLineaTarjeta("IIBB PERCEP-BSAS 2,00%( 70101,46)")).toBe("impuestos");
    expect(categoriaDeLineaTarjeta("DB.RG 5617 30% ( 455645,52 )")).toBe("impuestos");
    expect(categoriaDeLineaTarjeta("DB IVA $ RESP INSC. 21%")).toBe("impuestos");
    expect(categoriaDeLineaTarjeta("PERCEP.IVA RG2408 3,0%")).toBe("impuestos");
    expect(categoriaDeLineaTarjeta("COMISION MANT.CUENTA")).toBe("comisiones");
    expect(categoriaDeLineaTarjeta("INTERESES FINANCIACION")).toBe("intereses");
    expect(categoriaDeLineaTarjeta("DIVANO Y VILLAR")).toBe("consumos");
  });
});

describe("costoBancosYTarjetas", () => {
  it("arma una fila por cuenta y por tarjeta, con pesos y dólares aparte", () => {
    const filas = costoBancosYTarjetas(
      {
        bancos: [
          { id: 1, company: "BGA", date: "2026-08-05", bank: "Santander", movementType: "debito", amount: 100, conceptKey: "b_com_paquete" },
          { id: 2, company: "BGA", date: "2026-08-06", bank: "Santander", movementType: "debito", amount: 50, conceptKey: "b_imp_debito" },
          { id: 3, company: "BGA", date: "2026-08-07", bank: "Santander", movementType: "debito", amount: 999, conceptKey: "b_tarjeta_credito" },
          { id: 4, company: "BGA", date: "2026-09-07", bank: "Santander", movementType: "debito", amount: 7, conceptKey: "b_com_paquete" },
        ],
        tarjetas: [{ id: 10, company: "BGA", name: "Visa", bank: "Patagonia" }],
        resumenes: [{ id: 20, company: "BGA", cardId: 10, closingDate: "2026-08-27", dueDate: "2026-09-10", totalArs: 1100, totalUsd: 5, paid: false }],
        consumos: [
          { id: 30, company: "BGA", cardId: 10, statementId: 20, date: "2026-08-01", description: "DIVANO Y VILLAR", amount: 1000, currency: "ARS", group: "Materiales" },
          { id: 31, company: "BGA", cardId: 10, statementId: 20, date: "2026-08-27", description: "IMPUESTO DE SELLOS", amount: 100, currency: "ARS", group: "" },
          { id: 32, company: "BGA", cardId: 10, statementId: 20, date: "2026-08-10", description: "AMAZON", amount: 5, currency: "USD", group: "" },
        ],
      },
      "2026-08-01",
      "2026-08-31"
    );
    const cuenta = filas.find((f) => f.tipo === "cuenta")!;
    expect(cuenta.ars).toMatchObject({ comisiones: 100, impuestos: 50, total: 150 });
    const tarjeta = filas.find((f) => f.tipo === "tarjeta")!;
    expect(tarjeta.nombre).toBe("Visa · Patagonia");
    expect(tarjeta.ars).toMatchObject({ consumos: 1000, impuestos: 100, total: 1100 });
    expect(tarjeta.usd.total).toBe(5);
    expect(tarjeta.consumosPorTipo).toEqual([{ tipo: "Materiales", monto: 1000 }]);
    expect(tarjeta.resumenes?.[0]).toMatchObject({ vencimiento: "2026-09-10", pagado: false });
  });
});

describe("debitoSospechoso", () => {
  it("marca los débitos cuyo texto no es de un costo bancario (casos reales de De Raíz)", () => {
    expect(debitoSospechoso("DEBITO P/ACREDITAC.DE SUELDOS")).toBe(true);
    expect(debitoSospechoso("TRANSF. TERCEROS O/BCO. EBANK")).toBe(true);
    expect(debitoSospechoso("PAGO DE SERVICIOS")).toBe(true);
    expect(debitoSospechoso("IMP.DB/CR BANCARIOS P/DEBITOS")).toBe(false);
    expect(debitoSospechoso("COMISION MANT. CUENTA")).toBe(false);
  });
});
