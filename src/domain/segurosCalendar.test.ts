import {
  montoMensualSeguro,
  conceptKeyForSeguro,
  seguroGeneraPrevision,
  mesEnVigencia,
  segurosPrevisionMensual,
} from "./segurosCalendar";
import type { Seguro } from "./types";

const seg = (over: Partial<Seguro>): Seguro => ({
  id: 1,
  company: "BGA",
  tipo: "Seguro de vehículo",
  descripcion: "",
  aseguradora: "",
  numeroPoliza: "",
  costoMensual: 0,
  vigenciaDesde: "",
  vigenciaHasta: "",
  estado: "activo",
  polizaUrl: "",
  polizaName: "",
  notas: "",
  diaDebito: 10,
  administration: "blanco",
  rendicion: "numerica",
  alimentaPlanilla: true,
  ...over,
});

describe("montoMensualSeguro", () => {
  it("numérica usa costoMensual", () => {
    expect(montoMensualSeguro({ rendicion: "numerica", costoMensual: 5000 })).toBe(5000);
  });
  it("porcentual aplica % sobre montoBase", () => {
    expect(
      montoMensualSeguro({ rendicion: "porcentual", costoMensual: 0, porcentaje: 2, montoBase: 100000 })
    ).toBe(2000);
  });
});

describe("conceptKeyForSeguro", () => {
  it("mapea por tipo (ignora acentos)", () => {
    expect(conceptKeyForSeguro({ tipo: "Póliza de vehículo" })).toBe("seg_vehiculo");
    expect(conceptKeyForSeguro({ tipo: "Seguro de caución" })).toBe("seg_caucion_1");
    expect(conceptKeyForSeguro({ tipo: "Integral de comercio" })).toBe("seg_integral_comercio");
    expect(conceptKeyForSeguro({ tipo: "Maquinarias" })).toBe("seg_maquinarias");
  });
  it("respeta el conceptKey explícito", () => {
    expect(conceptKeyForSeguro({ tipo: "cualquiera", conceptKey: "seg_caucion_2" })).toBe("seg_caucion_2");
  });
  it("tipo desconocido -> vacío", () => {
    expect(conceptKeyForSeguro({ tipo: "algo raro" })).toBe("");
  });
});

describe("seguroGeneraPrevision", () => {
  it("activo con monto genera", () => {
    expect(seguroGeneraPrevision(seg({ costoMensual: 100 }))).toBe(true);
  });
  it("baja NO genera", () => {
    expect(seguroGeneraPrevision(seg({ costoMensual: 100, estado: "baja" }))).toBe(false);
  });
  it("ART (alimentaPlanilla false) NO genera — su costo ya está en la nómina", () => {
    expect(seguroGeneraPrevision(seg({ costoMensual: 100, alimentaPlanilla: false }))).toBe(false);
  });
  it("ART por tipo NO genera aunque no se toque el checkbox (alimentaPlanilla undefined)", () => {
    expect(seguroGeneraPrevision(seg({ tipo: "ART", costoMensual: 100, alimentaPlanilla: undefined }))).toBe(false);
  });
  it("ART forzada con alimentaPlanilla true SÍ genera", () => {
    expect(seguroGeneraPrevision(seg({ tipo: "ART", costoMensual: 100, alimentaPlanilla: true }))).toBe(true);
  });
  it("monto 0 NO genera", () => {
    expect(seguroGeneraPrevision(seg({ costoMensual: 0 }))).toBe(false);
  });
});

describe("mesEnVigencia", () => {
  it("dentro del rango", () => {
    expect(mesEnVigencia("2026-05", "2026-01-01", "2026-12-31")).toBe(true);
  });
  it("antes del desde / después del hasta", () => {
    expect(mesEnVigencia("2025-12", "2026-01-01", "2026-12-31")).toBe(false);
    expect(mesEnVigencia("2027-01", "2026-01-01", "2026-12-31")).toBe(false);
  });
  it("vigencia abierta (sin fechas) siempre entra", () => {
    expect(mesEnVigencia("2026-05", "", "")).toBe(true);
  });
});

describe("segurosPrevisionMensual", () => {
  const meses = ["2026-01", "2026-02", "2026-03"];

  it("genera una previsión por mes en vigencia, en el día de débito", () => {
    const s = seg({ costoMensual: 5000, diaDebito: 15, vigenciaDesde: "2026-01-01", vigenciaHasta: "2026-12-31" });
    const entries = segurosPrevisionMensual([s], meses);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ date: "2026-01-15", amount: 5000, administration: "blanco", conceptKey: "seg_vehiculo" });
  });

  it("acota el día 31 al último día del mes (febrero)", () => {
    const s = seg({ costoMensual: 100, diaDebito: 31, vigenciaDesde: "2026-02-01", vigenciaHasta: "2026-02-28" });
    const entries = segurosPrevisionMensual([s], ["2026-02"]);
    expect(entries[0].date).toBe("2026-02-28");
  });

  it("no genera fuera de vigencia", () => {
    const s = seg({ costoMensual: 100, vigenciaDesde: "2026-03-01", vigenciaHasta: "2026-03-31" });
    const entries = segurosPrevisionMensual([s], meses);
    expect(entries).toHaveLength(1);
    expect(entries[0].date.startsWith("2026-03")).toBe(true);
  });

  it("ART y dados de baja no generan", () => {
    const art = seg({ id: 2, tipo: "ART", costoMensual: 9999, alimentaPlanilla: false });
    const baja = seg({ id: 3, costoMensual: 500, estado: "baja" });
    expect(segurosPrevisionMensual([art, baja], meses)).toHaveLength(0);
  });
});
