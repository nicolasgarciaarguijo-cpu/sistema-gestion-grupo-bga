import { componerRecibo } from "./reciboComposicion";

// Numeros REALES del recibo de De Raiz (Carmona Bustamante, 07/2026) que paso Nicolas. Si algun dia
// alguien toca el reparto, este test dice enseguida que dejo de dar el recibo de verdad.
const CARMONA = {
  jubilacion: 222516.22,
  ley19032: 60686.24,
  obraSocial: 60686.24,
  sindicato: 60686.24,
  seguroVidaSepelio: 30343.12,
  contribJubilacion: 362856.79,
  contribObraSocial: 121372.48,
  art: 239092.6,
  scvo: 424.62,
  neto: 1650562.0,
};

describe("componerRecibo contra el recibo real de Carmona 07/2026", () => {
  const c = componerRecibo(CARMONA);
  const linea = (k: string) => c.lineas.find((l) => l.clave === k)!;

  it("sindical = aporte sindical + seguro de vida y sepelio, todo del trabajador", () => {
    expect(linea("sindical").trabajador).toBeCloseTo(91029.36, 2);
    expect(linea("sindical").empleador).toBe(0);
  });

  it("el 18% patronal se parte en seguridad social (16,41) e INSSJP (1,59)", () => {
    expect(linea("segSocial").empleador).toBeCloseTo(330804.44, 1);
    expect(linea("inssjp").empleador).toBeCloseTo(32052.35, 1);
    // Y las dos partes suman exactamente el 18% que figura arriba.
    expect(linea("segSocial").empleador + linea("inssjp").empleador).toBeCloseTo(362856.79, 2);
  });

  it("seguridad social, obra social e INSSJP dan los totales del recibo", () => {
    expect(linea("segSocial").total).toBeCloseTo(553320.66, 1);
    expect(linea("obraSocial").total).toBeCloseTo(182058.72, 2);
    expect(linea("inssjp").total).toBeCloseTo(92738.59, 1);
  });

  it("ART y SCVO los paga solo el empleador", () => {
    expect(linea("art")).toMatchObject({ empleador: 239092.6, trabajador: 0 });
    expect(linea("scvo")).toMatchObject({ empleador: 424.62, trabajador: 0 });
  });

  it("los totales coinciden con el subtotal de contribuciones y con los descuentos", () => {
    expect(c.totalEmpleador).toBeCloseTo(723746.49, 1);   // SUB TOTAL CONTRIBUCIONES EMPLEADOR
    expect(c.totalTrabajador).toBeCloseTo(434918.06, 2);  // Descuentos
  });

  it("el costo total empleador da el del recibo", () => {
    expect(c.costoTotalEmpleador).toBeCloseTo(2809226.55, 1);
  });

  it("el reparto de la torta da los mismos porcentajes y suma 100", () => {
    const p = (l: string) => c.reparto.find((x) => x.label === l)!.pct;
    expect(p("Sueldo neto")).toBeCloseTo(58.75, 1);
    expect(p("ART")).toBeCloseTo(8.51, 1);
    expect(p("Seguridad Social")).toBeCloseTo(19.7, 1);
    expect(p("Obra Social")).toBeCloseTo(6.48, 1);
    expect(p("Sindical")).toBeCloseTo(3.24, 1);
    expect(p("INSSJP")).toBeCloseTo(3.3, 1);
    expect(c.reparto.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100, 1);
  });
});
