import { countPersistedContent, isEmptyOverwrite } from "./persistGuard";

describe("countPersistedContent", () => {
  it("suma ítems de las colecciones con datos", () => {
    expect(
      countPersistedContent({
        employees: [{ id: 1 }, { id: 2 }],
        stockItems: [{ id: 1 }],
        approvedJobs: [],
      })
    ).toBe(3);
  });
  it("0 para estado vacío o nulo", () => {
    expect(countPersistedContent({})).toBe(0);
    expect(countPersistedContent(null)).toBe(0);
    expect(countPersistedContent(undefined)).toBe(0);
  });
  it("ignora campos que no son arrays (params escalares)", () => {
    expect(countPersistedContent({ markupPct: 50, vatPct: 21, employees: [{ id: 1 }] })).toBe(1);
  });
});

describe("isEmptyOverwrite", () => {
  it("bloquea cuando se pasa de tener datos a vacío", () => {
    expect(isEmptyOverwrite(120, 0)).toBe(true);
  });
  it("NO bloquea un usuario nuevo sin datos (0 -> 0)", () => {
    expect(isEmptyOverwrite(0, 0)).toBe(false);
  });
  it("NO bloquea ediciones normales (datos -> datos)", () => {
    expect(isEmptyOverwrite(120, 118)).toBe(false);
  });
  it("NO bloquea la primera carga con datos (0 -> n)", () => {
    expect(isEmptyOverwrite(0, 50)).toBe(false);
  });
});
