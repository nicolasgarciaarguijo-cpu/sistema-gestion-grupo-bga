import { entradasRetiros, resumenRetiros, RENGLON_RETIROS } from "./retirosSocietarios";

const r = (x: any) => ({ id: 1, company: "BGA", fecha: "2026-10-10", socio: "Nicolás", monto: 100, administration: "blanco", ...x });

describe("retiros societarios", () => {
  it("van al renglón de retiros, como egreso, con su moneda y circuito", () => {
    const [e] = entradasRetiros([r({ administration: "negro", moneda: "USD" })]);
    expect(e).toMatchObject({ id: "retiro-1", conceptKey: RENGLON_RETIROS, statusLabel: "debito", administration: "negro", currency: "USD" });
    expect(entradasRetiros([r({ monto: 0 })])).toEqual([]);
  });
  it("resumen por socio: blanco, negro y dólares separados, solo en el período", () => {
    const res = resumenRetiros(
      [
        r({ id: 1, monto: 100 }),
        r({ id: 2, monto: 50, administration: "negro" }),
        r({ id: 3, monto: 7, moneda: "USD" }),
        r({ id: 4, socio: "Gustavo", monto: 30 }),
        r({ id: 5, monto: 999, fecha: "2025-10-10" }),
      ],
      "2025-11-01",
      "2026-10-31"
    );
    const nico = res.find((x) => x.socio === "Nicolás")!;
    expect(nico).toMatchObject({ blanco: 100, negro: 50, total: 150, usd: 7, cantidad: 3 });
    expect(res.find((x) => x.socio === "Gustavo")!.total).toBe(30);
  });
});
