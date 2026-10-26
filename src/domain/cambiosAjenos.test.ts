import { filasAjenasNuevas, type FilaGuardada } from "./cambiosAjenos";

const fila = (module_key: string, company: string, saved_at: string, updated_by: string | null): FilaGuardada => ({ module_key, company, saved_at, updated_by });

describe("cambios de otra sesión", () => {
  it("la primera vez solo anota los sellos", () => {
    const r = filasAjenasNuevas(null, [fila("stock", "BGA", "2026-10-26T10:00:00Z", "joaquin")], "nicolas");
    expect(r.cambios).toBeNull();
    expect(r.sellos.size).toBe(1);
  });

  it("ve el cambio de Joaquín aunque el último guardado de toda la base sea mío", () => {
    const antes = filasAjenasNuevas(null, [fila("stock", "BGA", "2026-10-26T10:00:00Z", "joaquin"), fila("costos", "BGA", "2026-10-26T10:01:00Z", "nicolas")], "nicolas").sellos;
    const r = filasAjenasNuevas(
      antes,
      [
        fila("stock", "BGA", "2026-10-26T10:02:00Z", "joaquin"),
        fila("costos", "BGA", "2026-10-26T10:05:00Z", "nicolas"), // lo mio es lo mas nuevo
      ],
      "nicolas"
    );
    expect(r.cambios).toEqual({ moduleKeys: ["stock"], updatedBy: "joaquin", savedAt: "2026-10-26T10:02:00Z" });
  });

  it("no depende del reloj: un guardado ajeno con hora más vieja igual cuenta", () => {
    const antes = filasAjenasNuevas(null, [fila("stock", "BGA", "2026-10-26T10:00:00Z", "nicolas")], "nicolas").sellos;
    const r = filasAjenasNuevas(antes, [fila("stock", "BGA", "2026-10-26T09:58:00Z", "joaquin")], "nicolas");
    expect(r.cambios?.moduleKeys).toEqual(["stock"]);
  });

  it("lo propio y lo que no cambió no son cambios ajenos", () => {
    const filas = [fila("stock", "BGA", "2026-10-26T10:00:00Z", "joaquin")];
    const antes = filasAjenasNuevas(null, filas, "nicolas").sellos;
    expect(filasAjenasNuevas(antes, filas, "nicolas").cambios).toBeNull();
    expect(filasAjenasNuevas(antes, [fila("stock", "BGA", "2026-10-26T10:03:00Z", "nicolas")], "nicolas").cambios).toBeNull();
  });
});
