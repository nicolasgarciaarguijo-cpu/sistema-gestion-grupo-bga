import { fichaDeHaberes, haberesPorPagar, periodoDePago } from "./fichaHaberes";

const corr = (periodo: string, extra: any = {}) => ({
  periodo, blanco: 0, negro: 0, viaticoBlanco: 0, viaticoNegro: 0, conRecibo: false, fechaPrevista: `${periodo}-28`, ...extra,
});

describe("ficha de pago de haberes", () => {
  it("el pago sin periodo corresponde al mes anterior (sueldo a mes vencido)", () => {
    expect(periodoDePago("2026-10-06")).toBe("2026-09");
    expect(periodoDePago("2026-01-06")).toBe("2025-12");
  });

  it("corresponde vs pagado por periodo: pagado, parcial, pendiente y a favor", () => {
    const { periodos, saldo } = fichaDeHaberes(
      [
        corr("2026-09", { blanco: 1000, negro: 500, conRecibo: true }),
        corr("2026-08", { blanco: 1000 }),
        corr("2026-07", { negro: 300 }),
      ],
      [
        { id: 1, date: "2026-10-06", amount: 1000, administration: "blanco" },
        { id: 2, date: "2026-10-06", amount: 500, administration: "negro" },
        { id: 3, periodo: "2026-08", date: "2026-09-05", amount: 400, administration: "blanco" },
        { id: 4, periodo: "2026-07", date: "2026-08-05", amount: 350, administration: "negro" },
      ]
    );
    const de = (p: string) => periodos.find((x) => x.periodo === p)!;
    expect(de("2026-09")).toMatchObject({ corresponde: 1500, pagado: 1500, saldo: 0, estado: "pagado", pagoBlancoSinRecibo: false });
    expect(de("2026-08")).toMatchObject({ saldo: 600, estado: "parcial", pagoBlancoSinRecibo: true });
    expect(de("2026-07")).toMatchObject({ saldo: -50, estado: "a_favor" });
    expect(saldo).toBe(550);
    expect(periodos.map((p) => p.periodo)).toEqual(["2026-09", "2026-08", "2026-07"]);
  });

  it("el viatico fijo suma a lo que corresponde, en su circuito", () => {
    const [p] = fichaDeHaberes([corr("2026-09", { blanco: 1000, viaticoBlanco: 100, viaticoNegro: 50 })], []).periodos;
    expect(p).toMatchObject({ correspondeBlanco: 1100, correspondeNegro: 50, estado: "pendiente" });
  });

  it("lo que falta pagar baja a Pagos programados, una por persona y periodo", () => {
    const { periodos } = fichaDeHaberes([corr("2026-09", { blanco: 1000 }), corr("2026-08", { blanco: 1000 })], [
      { id: 1, periodo: "2026-08", date: "2026-09-05", amount: 1000, administration: "blanco" },
    ]);
    const items = haberesPorPagar({ id: 7, company: "BGA", name: "Nicolás" }, periodos, "2026-08");
    expect(items).toEqual([
      { clave: "haber:7:2026-09", company: "BGA", titulo: "Haberes · Nicolás · 09/2026", periodo: "2026-09", fecha: "2026-09-28", monto: 1000, administration: "blanco" },
    ]);
  });
});
