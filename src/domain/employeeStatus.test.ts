import {
  employedYears,
  isEmployeeActive,
  isEmployeeTerminated,
  terminationMonth,
  terminationReasonLabel,
  wasEmployedInMonth,
} from "./employeeStatus";

const activo = { hireDate: "2024-03-10", terminationDate: "" };
const baja = { hireDate: "2024-03-10", terminationDate: "2026-06-18" };

describe("estado del empleado", () => {
  it("activo mientras no tenga fecha de baja", () => {
    expect(isEmployeeActive(activo)).toBe(true);
    expect(isEmployeeActive({ terminationDate: undefined })).toBe(true);
    expect(isEmployeeActive({ terminationDate: "   " })).toBe(true);
    expect(isEmployeeTerminated(baja)).toBe(true);
  });

  it("mes de la baja", () => {
    expect(terminationMonth(baja)).toBe("2026-06");
    expect(terminationMonth(activo)).toBe("");
  });

  it("etiqueta del motivo", () => {
    expect(terminationReasonLabel("renuncia")).toBe("Renuncia");
    expect(terminationReasonLabel("")).toBe("Sin motivo");
  });
});

describe("wasEmployedInMonth", () => {
  it("el activo cuenta siempre desde su ingreso", () => {
    expect(wasEmployedInMonth(activo, "2026-09")).toBe(true);
    expect(wasEmployedInMonth(activo, "2024-02")).toBe(false);
  });

  it("la baja cuenta hasta su mes inclusive", () => {
    expect(wasEmployedInMonth(baja, "2026-05")).toBe(true);
    expect(wasEmployedInMonth(baja, "2026-06")).toBe(true);
    expect(wasEmployedInMonth(baja, "2026-07")).toBe(false);
  });

  it("sin mes, cae en el estado actual", () => {
    expect(wasEmployedInMonth(baja, "")).toBe(false);
    expect(wasEmployedInMonth(activo, "")).toBe(true);
  });
});

describe("employedYears", () => {
  it("cuenta anios cumplidos entre ingreso y baja", () => {
    expect(employedYears(baja)).toBe(2);
    expect(employedYears({ hireDate: "2024-07-01", terminationDate: "2026-06-30" })).toBe(1);
  });

  it("null si faltan datos o la baja es anterior al ingreso", () => {
    expect(employedYears(activo)).toBeNull();
    expect(employedYears({ hireDate: "", terminationDate: "2026-06-18" })).toBeNull();
    expect(employedYears({ hireDate: "2026-07-01", terminationDate: "2026-06-18" })).toBeNull();
  });
});
