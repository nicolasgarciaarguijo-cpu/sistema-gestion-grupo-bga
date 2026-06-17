import { getScaleForCategory } from "./scale";
import type { ScaleRow } from "./types";

const row = (over: Partial<ScaleRow>): ScaleRow => ({
  id: 0,
  month: "2026-01",
  category: "Oficial",
  baseHourly: 0,
  nonRemHourly: 0,
  vht: 0,
  sourceFileName: "",
  ...over,
});

describe("getScaleForCategory (F7)", () => {
  it("devuelve la fila exacta del mes y categoria pedidos", () => {
    const rows = [
      row({ id: 1, month: "2026-05", category: "Oficial", vht: 100 }),
      row({ id: 2, month: "2026-06", category: "Oficial", vht: 120 }),
    ];
    expect(getScaleForCategory(rows, "Oficial", "2026-06")?.vht).toBe(120);
  });

  it("matchea categoria sin importar mayusculas/minusculas", () => {
    const rows = [row({ id: 1, month: "2026-06", category: "Oficial", vht: 120 })];
    expect(getScaleForCategory(rows, "oficial", "2026-06")?.id).toBe(1);
  });

  it("fallback: si falta el mes pedido, usa el ultimo mes anterior cargado", () => {
    const rows = [
      row({ id: 1, month: "2026-03", category: "Oficial", vht: 90 }),
      row({ id: 2, month: "2026-05", category: "Oficial", vht: 110 }),
    ];
    // pido junio, no existe -> debe caer a mayo (110), no a marzo ni a null
    expect(getScaleForCategory(rows, "Oficial", "2026-06")?.vht).toBe(110);
  });

  it("fallback: si solo hay meses futuros, usa el mas cercano disponible", () => {
    const rows = [
      row({ id: 1, month: "2026-08", category: "Oficial", vht: 130 }),
      row({ id: 2, month: "2026-09", category: "Oficial", vht: 140 }),
    ];
    // pido junio, solo hay futuros -> usa el ultimo cargado (140) en vez de null
    expect(getScaleForCategory(rows, "Oficial", "2026-06")?.vht).toBe(140);
  });

  it("devuelve null si no hay ninguna fila para la categoria", () => {
    const rows = [row({ id: 1, month: "2026-06", category: "Ayudante", vht: 80 })];
    expect(getScaleForCategory(rows, "Oficial", "2026-06")).toBeNull();
  });

  it("devuelve null con lista vacia", () => {
    expect(getScaleForCategory([], "Oficial", "2026-06")).toBeNull();
  });
});
