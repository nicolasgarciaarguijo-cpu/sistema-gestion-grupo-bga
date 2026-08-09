import { computeVatPosition, vatPositionLabel } from "./vatBalance";

const iss = (company: string, date: string, vat: number) => ({ company, date, vat });
const pur = (company: string, date: string, vat: number, administration = "blanco") => ({
  company,
  date,
  vat,
  administration,
});

describe("computeVatPosition", () => {
  it("debito - credito sin VEP: cuenta todo", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-07-01", 1000), iss("A", "2026-07-15", 500)],
      purchases: [pur("A", "2026-07-10", 300)],
      veps: [],
    });
    expect(r.debito).toBe(1500);
    expect(r.credito).toBe(300);
    expect(r.posicion).toBe(1200); // a pagar
    expect(r.lastVepDate).toBeNull();
  });

  it("el VEP reinicia: solo cuenta lo POSTERIOR a su fecha", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-06-30", 9999), iss("A", "2026-07-05", 800)],
      purchases: [pur("A", "2026-06-20", 9999), pur("A", "2026-07-08", 200)],
      veps: [{ company: "A", date: "2026-06-30" }],
    });
    expect(r.debito).toBe(800); // solo la del 07-05 (la del 06-30 quedó en el período cerrado)
    expect(r.credito).toBe(200);
    expect(r.posicion).toBe(600);
    expect(r.lastVepDate).toBe("2026-06-30");
  });

  it("toma el ULTIMO VEP cuando hay varios", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-07-20", 400)],
      purchases: [],
      veps: [
        { company: "A", date: "2026-03-31" },
        { company: "A", date: "2026-06-30" },
      ],
    });
    expect(r.lastVepDate).toBe("2026-06-30");
    expect(r.debito).toBe(400);
  });

  it("las compras en NEGRO no dan credito fiscal", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-07-01", 1000)],
      purchases: [pur("A", "2026-07-02", 500, "negro"), pur("A", "2026-07-03", 200, "blanco")],
      veps: [],
    });
    expect(r.credito).toBe(200); // solo la blanca
  });

  it("no mezcla empresas ni VEP de otra empresa", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-07-01", 100), iss("B", "2026-07-01", 999)],
      purchases: [pur("B", "2026-07-01", 999)],
      veps: [{ company: "B", date: "2026-07-15" }], // VEP de B no afecta a A
    });
    expect(r.debito).toBe(100);
    expect(r.credito).toBe(0);
    expect(r.lastVepDate).toBeNull();
  });

  it("respeta el corte asOf", () => {
    const r = computeVatPosition({
      company: "A",
      issued: [iss("A", "2026-07-01", 100), iss("A", "2026-08-15", 999)],
      purchases: [],
      veps: [],
      asOf: "2026-07-31",
    });
    expect(r.debito).toBe(100);
  });

  it("etiqueta: a pagar / a favor / equilibrado", () => {
    expect(vatPositionLabel(1200).tone).toBe("out");
    expect(vatPositionLabel(-500).tone).toBe("in");
    expect(vatPositionLabel(0).tone).toBe("neutral");
  });
});
