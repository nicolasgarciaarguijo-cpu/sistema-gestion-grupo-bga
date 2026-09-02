import { seguroVigencia, resumenSegurosPorEmpresa } from "./seguros";
import type { Seguro } from "./types";

const seg = (over: Partial<Seguro>): Seguro => ({
  id: 1,
  company: "BGA",
  tipo: "ART",
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
  ...over,
});

describe("seguroVigencia", () => {
  const hoy = "2026-09-01";
  it("vencido si la fecha ya pasó", () => {
    expect(seguroVigencia("2026-08-31", hoy)).toBe("vencido");
  });
  it("por vencer dentro de la ventana de aviso", () => {
    expect(seguroVigencia("2026-09-20", hoy)).toBe("por_vencer"); // 19 días
  });
  it("vigente si falta más que la ventana", () => {
    expect(seguroVigencia("2026-12-01", hoy)).toBe("vigente");
  });
  it("hoy mismo cuenta como por vencer (no vencido)", () => {
    expect(seguroVigencia("2026-09-01", hoy)).toBe("por_vencer");
  });
  it("sin fecha válida -> sin_fecha", () => {
    expect(seguroVigencia("", hoy)).toBe("sin_fecha");
    expect(seguroVigencia("no-es-fecha", hoy)).toBe("sin_fecha");
  });
  it("respeta la ventana de aviso configurable", () => {
    expect(seguroVigencia("2026-09-20", hoy, 10)).toBe("vigente"); // 19 > 10
    expect(seguroVigencia("2026-09-20", hoy, 30)).toBe("por_vencer");
  });
});

describe("resumenSegurosPorEmpresa", () => {
  const hoy = "2026-09-01";
  const seguros: Seguro[] = [
    seg({ id: 1, company: "BGA", costoMensual: 100, vigenciaHasta: "2026-12-01" }), // vigente
    seg({ id: 2, company: "BGA", costoMensual: 50, vigenciaHasta: "2026-09-10" }), // por vencer
    seg({ id: 3, company: "BGA", costoMensual: 30, vigenciaHasta: "2026-08-01" }), // vencido
    seg({ id: 4, company: "BGA", costoMensual: 999, estado: "baja", vigenciaHasta: "2026-12-01" }), // baja: no cuenta
    seg({ id: 5, company: "De raiz s.r.l", costoMensual: 70, vigenciaHasta: "2026-12-01" }),
  ];

  it("suma el costo mensual solo de los activos y separa por empresa", () => {
    const r = resumenSegurosPorEmpresa(seguros, ["BGA", "De raiz s.r.l"], hoy);
    const bga = r.find((x) => x.company === "BGA")!;
    expect(bga.cantidad).toBe(3); // el de baja no cuenta
    expect(bga.costoMensualTotal).toBe(180); // 100+50+30
    expect(bga.vigentes).toBe(1);
    expect(bga.porVencer).toBe(1);
    expect(bga.vencidos).toBe(1);
    const dr = r.find((x) => x.company === "De raiz s.r.l")!;
    expect(dr.cantidad).toBe(1);
    expect(dr.costoMensualTotal).toBe(70);
  });

  it("una empresa sin seguros da todo en cero", () => {
    const r = resumenSegurosPorEmpresa(seguros, ["Otra"], hoy);
    expect(r[0]).toMatchObject({ cantidad: 0, costoMensualTotal: 0, vigentes: 0, porVencer: 0, vencidos: 0 });
  });
});
