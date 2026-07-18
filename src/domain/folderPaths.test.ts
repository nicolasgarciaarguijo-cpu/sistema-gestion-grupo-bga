import {
  companyFolderName,
  companyPeriodPath,
  fiscalStartYearOf,
  fiscalYearFolderName,
  monthFolderName,
  isPeriodicSection,
  personalSectionPath,
  PERSONAL_SECTIONS,
} from "./folderPaths";

describe("companyFolderName", () => {
  it("la empresa siempre va primero y en mayusculas", () => {
    expect(companyFolderName("BGA")).toBe("BGA");
    expect(companyFolderName("De raiz")).toBe("DE RAIZ");
  });
  it("General (la conjunta, solo reportes) se normaliza a GENERAL", () => {
    expect(companyFolderName("General")).toBe("GENERAL");
    expect(companyFolderName("general")).toBe("GENERAL");
    expect(companyFolderName("")).toBe("GENERAL");
  });
});

describe("ejercicio fiscal (nov-oct)", () => {
  // El ejercicio arranca en noviembre: nov y dic pertenecen al ejercicio que abre ese año.
  it("noviembre y diciembre abren el ejercicio del mismo año", () => {
    expect(fiscalStartYearOf(11, 2023, 11)).toBe(2023);
    expect(fiscalStartYearOf(11, 2023, 12)).toBe(2023);
  });
  it("de enero a octubre pertenecen al ejercicio que abrio el año anterior", () => {
    expect(fiscalStartYearOf(11, 2024, 1)).toBe(2023);
    expect(fiscalStartYearOf(11, 2024, 10)).toBe(2023);
  });
  it("arma la carpeta del ejercicio con el periodo aclarado", () => {
    expect(fiscalYearFolderName(11, 2024, 1)).toBe("Ejercicio 2023-2024 (nov-oct)");
    expect(fiscalYearFolderName(11, 2023, 11)).toBe("Ejercicio 2023-2024 (nov-oct)");
    expect(fiscalYearFolderName(11, 2023, 10)).toBe("Ejercicio 2022-2023 (nov-oct)");
  });
  it("soporta otro mes de inicio (si mañana entra una empresa con otro calendario)", () => {
    expect(fiscalYearFolderName(1, 2024, 5)).toBe("Ejercicio 2024-2025 (ene-dic)");
    expect(fiscalYearFolderName(7, 2024, 5)).toBe("Ejercicio 2023-2024 (jul-jun)");
  });
});

describe("monthFolderName", () => {
  it("ordena cronologicamente dentro del ejercicio", () => {
    expect(monthFolderName(2023, 11)).toBe("2023-11 Noviembre");
    expect(monthFolderName(2024, 1)).toBe("2024-01 Enero");
    // dentro de "Ejercicio 2023-2024": 2023-11 < 2023-12 < 2024-01
    expect("2023-11 Noviembre" < "2024-01 Enero").toBe(true);
  });
});

describe("secciones de Personal", () => {
  it("la documentacion cruda NO se separa por mes (no vence)", () => {
    expect(isPeriodicSection("Documentacion")).toBe(false);
  });
  it("lo que tiene periodicidad si se separa", () => {
    ["EPP", "Recibos", "Presentismo", "Examenes", "Capacitaciones", "Insumos"].forEach((s) =>
      expect(isPeriodicSection(s)).toBe(true)
    );
  });
  it("una seccion nueva desconocida se asume periodica", () => {
    expect(isPeriodicSection("Sanciones")).toBe(true);
  });
  it("estan las secciones basicas", () => {
    expect(PERSONAL_SECTIONS.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Documentacion", "EPP", "Recibos", "Presentismo"])
    );
  });
});

describe("personalSectionPath", () => {
  it("empresa -> empleado -> seccion -> ejercicio -> mes", () => {
    expect(
      personalSectionPath({
        companyShort: "De raiz",
        employeeFolder: "MAXIMILIANO EZEQUIEL PACIFICO",
        section: "Recibos",
        iso: "2026-05-13",
      })
    ).toBe("Personal/DE RAIZ/MAXIMILIANO EZEQUIEL PACIFICO/Recibos/Ejercicio 2025-2026 (nov-oct)/2026-05 Mayo");
  });

  it("la documentacion cruda queda sin ejercicio ni mes", () => {
    expect(
      personalSectionPath({
        companyShort: "BGA",
        employeeFolder: "JUAN PEREZ",
        section: "Documentacion",
        iso: "2026-05-13",
      })
    ).toBe("Personal/BGA/JUAN PEREZ/Documentacion");
  });

  it("una seccion periodica sin fecha cae a la carpeta base (no inventa periodo)", () => {
    expect(
      personalSectionPath({ companyShort: "BGA", employeeFolder: "JUAN PEREZ", section: "EPP" })
    ).toBe("Personal/BGA/JUAN PEREZ/EPP");
  });

  it("un recibo de noviembre abre el ejercicio nuevo", () => {
    expect(
      personalSectionPath({
        companyShort: "De raiz",
        employeeFolder: "X",
        section: "Recibos",
        iso: "2024-11-05",
      })
    ).toContain("Ejercicio 2024-2025 (nov-oct)/2024-11 Noviembre");
  });
});

describe("companyPeriodPath (molde general por solapa)", () => {
  it("arma <TOP>/<EMPRESA>/Ejercicio/<mes> con la empresa primero", () => {
    expect(
      companyPeriodPath({ top: "Compras", companyShort: "De raiz", iso: "2026-05-14" })
    ).toBe("Compras/DE RAIZ/Ejercicio 2025-2026 (nov-oct)/2026-05 Mayo");
  });

  it("agrega la subcarpeta cuando se pasa", () => {
    expect(
      companyPeriodPath({
        top: "Compras",
        companyShort: "BGA",
        iso: "2026-05",
        sub: "Facturas de compra",
      })
    ).toBe("Compras/BGA/Ejercicio 2025-2026 (nov-oct)/2026-05 Mayo/Facturas de compra");
  });

  it("respeta el mes de inicio fiscal por empresa (ej. calendario ene-dic)", () => {
    expect(
      companyPeriodPath({ top: "Compras", companyShort: "BGA", iso: "2026-05", fiscalStartMonth: 1 })
    ).toBe("Compras/BGA/Ejercicio 2026-2027 (ene-dic)/2026-05 Mayo");
  });

  it("un mes antes del inicio fiscal cae en el ejercicio anterior", () => {
    // octubre con año fiscal nov-oct es el ULTIMO mes del ejercicio anterior
    expect(
      companyPeriodPath({ top: "Compras", companyShort: "De raiz", iso: "2026-10" })
    ).toContain("Ejercicio 2025-2026 (nov-oct)/2026-10 Octubre");
  });
});
