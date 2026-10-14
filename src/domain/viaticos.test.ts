import { mesesEntre, viaticosFijos, RENGLON_VIATICOS } from "./viaticos";

const pago = (periodo: string) => `${periodo.slice(0, 4)}-${String(Number(periodo.slice(5, 7)) % 12 + 1).padStart(2, "0")}-06`.replace(/^(\d{4})-01/, (_m, y) => `${Number(y) + (periodo.endsWith("12") ? 1 : 0)}-01`);

describe("mesesEntre", () => {
  it("cruza de año", () => {
    expect(mesesEntre("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});

describe("viaticosFijos", () => {
  it("sale cada mes ya pagado, blanco y negro separados, desde el alta del acuerdo", () => {
    const r = viaticosFijos(
      [{ id: 1, name: "Juan", company: "De raiz s.r.l", viaticoFijo: { blanco: 1000, negro: 500, desde: "2026-08" } }],
      "2026-10-14",
      pago
    );
    // agosto (paga 06/09) y septiembre (paga 06/10); octubre se paga en noviembre: todavia no.
    expect(r.map((e) => e.date)).toEqual(["2026-09-06", "2026-09-06", "2026-10-06", "2026-10-06"]);
    expect(r.filter((e) => e.administration === "negro").map((e) => e.amount)).toEqual([500, 500]);
    expect(r.every((e) => e.conceptKey === RENGLON_VIATICOS && e.id.startsWith("payroll-viatico-"))).toBe(true);
  });
  it("sin acuerdo, en cero o después de la baja, no sale", () => {
    expect(viaticosFijos([{ id: 2, name: "A", company: "x" }], "2026-10-14", pago)).toEqual([]);
    expect(viaticosFijos([{ id: 2, name: "A", company: "x", viaticoFijo: { blanco: 0, negro: 0, desde: "2026-08" } }], "2026-10-14", pago)).toEqual([]);
    const conBaja = viaticosFijos(
      [{ id: 3, name: "B", company: "x", viaticoFijo: { blanco: 100, negro: 0, desde: "2026-08" }, terminationDate: "2026-08-20" }],
      "2026-10-14",
      pago
    );
    expect(conBaja.map((e) => e.date)).toEqual(["2026-09-06"]);
  });
});
