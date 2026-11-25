import { aporteSindical, esProveedorSindicato, obligacionMensual, periodoDelDoc, planDeObligacion, type DocObligacion } from "./obligacionMensual";

// IVA y Sindicato (Nicolas, 21/11/2026): el sistema calcula, la boleta real se carga y se cruzan; se paga o
// se saca un plan, y el contador de "por pagar" se reinicia cuando se carga la boleta.
const HOY = "2026-11-21";
const meses = [
  { mes: "2026-08", calculado: 9255138 },
  { mes: "2026-09", calculado: 3000000 },
  { mes: "2026-10", calculado: 2000000 },
  { mes: "2026-11", calculado: 500000 },
];
const doc = (extra: Partial<DocObligacion> = {}): DocObligacion => ({ id: 1, company: "De Raiz", supplier: "ARCA", fecha: "2026-11-25", total: 6940676, periodo: "2026-08", ...extra });
const plan = planDeObligacion({ deudaId: 7, concepto: "Plan IVA", capital: 3000000, total: 3600000, cuotas: 6, cuotasPagadas: 2, pagado: 1200000, pendiente: 2400000 });
const calc = (docs: DocObligacion[]) => obligacionMensual({ company: "De Raiz", meses, docs, hoy: HOY });
const mes = (r: ReturnType<typeof calc>, m: string) => r.meses.find((x) => x.mes === m)!;

describe("obligacion mensual (IVA y sindicato)", () => {
  it("sin boletas: los meses cerrados quedan sin cargar, el corriente en curso, y todo suma al contador", () => {
    const r = calc([]);
    expect(r.meses.map((m) => m.resolucion)).toEqual(["sin_cargar", "sin_cargar", "sin_cargar", "en_curso"]);
    expect(r.porPagar).toBe(9255138 + 3000000 + 2000000 + 500000);
    expect(r.costumbre).toEqual({ pagados: 0, enPlan: 0, pendientes: 0, sinCargar: 3 });
  });

  it("cargar la boleta de un mes lo saca del contador (se reinicia) y muestra la diferencia con lo calculado", () => {
    const r = calc([doc()]);
    expect(r.porPagar).toBe(3000000 + 2000000 + 500000);
    expect(mes(r, "2026-08")).toMatchObject({ cargado: 6940676, pendiente: 6940676, diferencia: 6940676 - 9255138, resolucion: "pendiente" });
    expect(r.pendiente).toBe(6940676);
  });

  it("boleta pagada: el mes queda pagado", () => {
    const r = calc([doc({ pagadaEl: "2026-11-25" })]);
    expect(mes(r, "2026-08")).toMatchObject({ pagado: 6940676, pendiente: 0, resolucion: "pagado" });
    expect(r.costumbre.pagados).toBe(1);
    expect(r.pendiente).toBe(0);
  });

  it("boleta que fue a un plan: el mes queda en plan, con sus intereses y su evolucion", () => {
    const r = calc([doc({ id: 2, periodo: "2026-09", total: 3000000, plan })]);
    expect(mes(r, "2026-09")).toMatchObject({ enPlan: 3000000, pagado: 0, pendiente: 0, resolucion: "plan" });
    expect(r.costumbre.enPlan).toBe(1);
    expect(r.planes).toHaveLength(1);
    expect(r.planes[0]).toMatchObject({ interes: 600000, cuotas: 6, cuotasPagadas: 2, pendiente: 2400000 });
    expect(r.intereses).toBe(600000);
  });

  it("un plan que junta dos meses se cuenta una sola vez", () => {
    const r = calc([doc({ id: 2, periodo: "2026-09", total: 1500000, plan }), doc({ id: 3, periodo: "2026-10", total: 1500000, plan })]);
    expect(r.planes).toHaveLength(1);
    expect(r.intereses).toBe(600000);
    expect(r.costumbre.enPlan).toBe(2);
  });

  it("sin periodo aclarado, la boleta paga el mes anterior al de su fecha", () => {
    expect(periodoDelDoc({ fecha: "2026-11-05" })).toBe("2026-10");
    expect(periodoDelDoc({ fecha: "2027-01-05" })).toBe("2026-12");
    expect(periodoDelDoc({ fecha: "2026-11-05", periodo: "2026-08" })).toBe("2026-08");
    const r = calc([doc({ periodo: undefined, fecha: "2026-11-05", total: 378093, pagadaEl: "2026-11-05" })]);
    expect(mes(r, "2026-10").resolucion).toBe("pagado");
  });

  it("no mezcla empresas", () => {
    expect(calc([doc({ company: "BGA" })]).pendiente).toBe(0);
  });

  it("un mes sin nada que pagar no reclama boleta", () => {
    const r = obligacionMensual({ company: "De Raiz", meses: [{ mes: "2026-09", calculado: 0 }], docs: [], hoy: HOY });
    expect(r.meses[0].resolucion).toBe("nada");
    expect(r.costumbre.sinCargar).toBe(0);
  });

  it("el interes del plan es lo que suman las cuotas menos lo que se debia; sin capital no se inventa", () => {
    expect(plan.interes).toBe(600000);
    expect(planDeObligacion({ deudaId: 1, concepto: "x", capital: 0, total: 500, cuotas: 1, cuotasPagadas: 0, pagado: 0, pendiente: 500 }).interes).toBe(0);
    expect(planDeObligacion({ deudaId: 1, concepto: "x", capital: 600, total: 500, cuotas: 1, cuotasPagadas: 0, pagado: 0, pendiente: 500 }).interes).toBe(0);
  });
});

describe("sindicato", () => {
  it("el aporte es el porcentaje sobre la base", () => {
    expect(aporteSindical(10000000, 2.5)).toBe(250000);
    expect(aporteSindical(10000000, 0)).toBe(0);
    expect(aporteSindical(-5, 3)).toBe(0);
  });
  it("reconoce al sindicato por el nombre del proveedor", () => {
    expect(esProveedorSindicato("USIMRA CABA")).toBe(true);
    expect(esProveedorSindicato("Usimra San Martín")).toBe(true);
    expect(esProveedorSindicato("Sindicato CABA")).toBe(true);
    expect(esProveedorSindicato("ARCA")).toBe(false);
    expect(esProveedorSindicato("Maderas DAC")).toBe(false);
  });
});

// Nicolas, 25/11/2026: "cargas sociales esta vinculado con el proveedor arca tambien, pero lo quiero ver por separado
// cargas sociales e iva".
describe("que obligacion paga un comprobante", () => {
  const { obligacionDeFactura } = require("./obligacionMensual");
  const { esPagoDeIva, facturasDelFiscoSinPeriodo, vepsDesdeFacturas } = require("./pagoDeIva");

  it("sin elegir nada lo dice el proveedor: ARCA es IVA, el sindicato es sindicato", () => {
    expect(obligacionDeFactura({ supplier: "ARCA" })).toBe("iva");
    expect(obligacionDeFactura({ supplier: "USIMRA CABA" })).toBe("sindicato");
    expect(obligacionDeFactura({ supplier: "Pinturería" })).toBeNull();
  });

  it("lo elegido en la ficha manda: ARCA puede ser cargas sociales, o el VEP del sindicato", () => {
    expect(obligacionDeFactura({ supplier: "ARCA", obligacion: "cargas_sociales" })).toBe("cargas_sociales");
    expect(obligacionDeFactura({ supplier: "ARCA", obligacion: "sindicato" })).toBe("sindicato");
  });

  it("las cargas sociales pagadas a ARCA no cuentan como el VEP del IVA", () => {
    const base = { id: 1, company: "BGA", supplier: "ARCA", invoiceDate: "2026-11-10", total: 500, ivaPeriodoMes: "2026-10", pagadaEl: "2026-11-10" };
    expect(esPagoDeIva(base)).toBe(true);
    expect(esPagoDeIva({ ...base, obligacion: "cargas_sociales" })).toBe(false);
    expect(vepsDesdeFacturas([base, { ...base, id: 2, obligacion: "cargas_sociales" }])).toHaveLength(1);
    expect(facturasDelFiscoSinPeriodo([{ ...base, ivaPeriodoMes: undefined, obligacion: "cargas_sociales" }])).toHaveLength(0);
  });
});
