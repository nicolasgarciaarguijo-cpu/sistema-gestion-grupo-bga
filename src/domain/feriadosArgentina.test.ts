import { domingoDePascua, feriadosDelAnio, mapaDeFeriados, esFinDeSemana } from "./feriadosArgentina";

const aIso = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

describe("feriados argentinos", () => {
  it("calcula el domingo de Pascua", () => {
    expect(aIso(domingoDePascua(2024))).toBe("2024-03-31");
    expect(aIso(domingoDePascua(2025))).toBe("2025-04-20");
    expect(aIso(domingoDePascua(2026))).toBe("2026-04-05");
  });

  it("Carnaval y Viernes Santo salen de Pascua", () => {
    const m = mapaDeFeriados([2026]);
    // Pascua 2026: 5/4. Carnaval lunes 16 y martes 17 de febrero; Viernes Santo 3/4.
    expect(m.get("2026-02-16")).toBe("Carnaval");
    expect(m.get("2026-02-17")).toBe("Carnaval");
    expect(m.get("2026-04-03")).toBe("Viernes Santo");
  });

  it("los feriados fijos están", () => {
    const m = mapaDeFeriados([2026]);
    expect(m.get("2026-01-01")).toBe("Año Nuevo");
    expect(m.get("2026-05-25")).toBe("Revolución de Mayo");
    expect(m.get("2026-07-09")).toBe("Día de la Independencia");
    expect(m.get("2026-12-25")).toBe("Navidad");
  });

  it("los trasladables se corren al lunes según la ley 27.399", () => {
    // 17/8/2026 cae LUNES: no se mueve.
    expect(feriadosDelAnio(2026).find((f) => f.nombre.includes("San Martín"))!.iso).toBe("2026-08-17");
    // 17/8/2027 cae MARTES: se pasa al lunes anterior (16/8).
    expect(feriadosDelAnio(2027).find((f) => f.nombre.includes("San Martín"))!.iso).toBe("2027-08-16");
    // 12/10/2026 cae LUNES: queda.
    expect(feriadosDelAnio(2026).find((f) => f.nombre === "Diversidad Cultural")!.iso).toBe("2026-10-12");
    // 20/11/2026 cae VIERNES: se pasa al lunes siguiente (23/11).
    expect(feriadosDelAnio(2026).find((f) => f.nombre === "Soberanía Nacional")!.iso).toBe("2026-11-23");
  });

  it("un feriado que cae fin de semana no se mueve", () => {
    // 9/7/2026 es jueves; 25/5/2025 es domingo y sigue siendo el 25.
    expect(mapaDeFeriados([2025]).get("2025-05-25")).toBe("Revolución de Mayo");
  });

  it("reconoce sábados y domingos", () => {
    expect(esFinDeSemana("2026-08-29")).toBe(true);  // sábado
    expect(esFinDeSemana("2026-08-30")).toBe(true);  // domingo
    expect(esFinDeSemana("2026-08-28")).toBe(false); // viernes
    expect(esFinDeSemana("")).toBe(false);
  });
});
