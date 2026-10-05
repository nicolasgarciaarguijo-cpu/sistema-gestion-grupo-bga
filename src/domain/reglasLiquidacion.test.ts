import { reglasDeLiquidacion } from "./reglasLiquidacion";

const texto = (cfg = {}) =>
  reglasDeLiquidacion(cfg)
    .flatMap((s) => [s.titulo, ...s.reglas])
    .join("\n");

// El bloque se arma con las constantes del calculo: estos tests fijan que lo que se LEE coincide con
// lo que se LIQUIDA. Si alguien cambia una regla en el codigo, el texto cambia con ella.
describe("reglasDeLiquidacion", () => {
  it("el margen de llegada dice hasta las 07:35 y tarde desde las 07:36", () => {
    expect(texto()).toContain("fichar hasta las 07:35 es presente en horario, todas las veces");
    expect(texto()).toContain("Desde las 07:36 es llegada tarde");
  });

  it("el sabado no es feriado y corta a las 13:00", () => {
    expect(texto()).toContain("Sábado (no es feriado): hasta las 13:00, extras al 50%");
  });

  it("los multiplicadores salen de los del calculo", () => {
    const t = texto();
    expect(t).toContain("Extra 50% x1,5");
    expect(t).toContain("Extra 100% x2");
    expect(t).toContain("Nocturna 50% x1,7");
    expect(t).toContain("Nocturna 100% x2,27");
  });

  it("la tabla del presentismo sale de la funcion que lo calcula", () => {
    const t = texto();
    expect(t).toContain("1 tarde: 75%. 2 tardes: 50%. 3 o más tardes: 0%.");
    expect(t).toContain("1 ausencia: 50%. 2 o más ausencias: 0%.");
    expect(t).toContain("1 tarde + 1 ausencia = 50%");
  });

  it("toma los porcentajes de la configuracion de la empresa", () => {
    const t = texto({ seniorityPctPerYear: 1, unionPct: 3, insurancePct: 1.5 });
    expect(t).toContain("Antigüedad: 1% por año");
    expect(t).toContain("sindicato 3%, seguro 1,5%");
  });
});
