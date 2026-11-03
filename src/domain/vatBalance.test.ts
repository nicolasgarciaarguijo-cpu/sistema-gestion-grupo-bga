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

describe("IVA mes a mes con el VEP como control (03/11/2026)", () => {
  const { ivaAnual } = require("./vatBalance");
  const base = {
    company: "A",
    issued: [{ company: "A", date: "2026-11-10", vat: 100 }, { company: "A", date: "2026-12-05", vat: 300 }, { company: "B", date: "2026-11-10", vat: 999 }],
    purchases: [{ company: "A", date: "2026-11-20", vat: 250 }, { company: "A", date: "2026-11-21", vat: 70, administration: "negro" }, { company: "A", date: "2027-01-03", vat: 10 }],
    desde: "2026-11-01",
    hasta: "2027-01-31",
    hoy: "2027-01-15",
  };
  it("el saldo a favor pasa al mes siguiente y el VEP no reinicia nada", () => {
    const r = ivaAnual({ ...base, veps: [{ company: "A", date: "2027-01-18", amount: 150 }] });
    expect(r.meses.map((m: any) => m.mes)).toEqual(["2026-11", "2026-12", "2027-01"]);
    // nov: 100 - 250 = -150 a favor que pasa; dic: 300 - 150 = 150 a pagar; el VEP de enero sin periodo paga diciembre.
    expect(r.meses[0]).toMatchObject({ posicion: -150, aPagar: 0, aFavorQuePasa: 150, control: "nada" });
    expect(r.meses[1]).toMatchObject({ arrastre: 150, aPagar: 150, vep: 150, control: "ok" });
    expect(r.mesActual.mes).toBe("2027-01");
  });
  it("controla el VEP contra lo que el sistema dice a pagar", () => {
    const falta = ivaAnual({ ...base, veps: [{ company: "A", date: "2027-01-18", amount: 100, periodoMes: "2026-12" }] });
    expect(falta.meses[1]).toMatchObject({ control: "falta", diferencia: -50 });
    const sinVep = ivaAnual({ ...base, veps: [] });
    expect(sinVep.meses[1].control).toBe("sin_vep");
    expect(sinVep.diferencia).toBe(-150);
  });
});
