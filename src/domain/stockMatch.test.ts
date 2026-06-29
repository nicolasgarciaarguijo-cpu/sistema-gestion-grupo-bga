import { matchStockForMaterial, applyStockMovement } from "./stockMatch";

describe("applyStockMovement", () => {
  it("entrada suma", () => expect(applyStockMovement(10, "entrada", 5)).toBe(15));
  it("salida resta", () => expect(applyStockMovement(10, "salida", 4)).toBe(6));
  it("nunca queda negativo", () => expect(applyStockMovement(3, "salida", 10)).toBe(0));
});


const byCode = new Map<string, any>([["c-100", { id: 1, code: "C-100" }]]);
const byDescription = new Map<string, any>([["tornillo", { id: 2, description: "Tornillo" }]]);

describe("matchStockForMaterial", () => {
  it("matchea por codigo cuando el material tiene stockCode", () => {
    expect(matchStockForMaterial({ stockCode: "C-100", description: "Otra cosa" }, byCode, byDescription)?.id).toBe(1);
  });
  it("cae a descripcion si el codigo no matchea", () => {
    expect(matchStockForMaterial({ stockCode: "no-existe", description: "Tornillo" }, byCode, byDescription)?.id).toBe(2);
  });
  it("usa descripcion si no hay codigo", () => {
    expect(matchStockForMaterial({ description: "TORNILLO" }, byCode, byDescription)?.id).toBe(2);
  });
  it("null si no matchea por ninguno", () => {
    expect(matchStockForMaterial({ stockCode: "x", description: "y" }, byCode, byDescription)).toBeNull();
  });
});
