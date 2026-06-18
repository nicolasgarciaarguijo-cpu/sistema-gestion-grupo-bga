import { newId } from "./id";

describe("newId", () => {
  it("devuelve un entero seguro positivo", () => {
    for (let i = 0; i < 100; i += 1) {
      const id = newId();
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    }
  });

  it("no colisiona en muchas llamadas seguidas (mismo ms)", () => {
    const set = new Set<number>();
    for (let i = 0; i < 20000; i += 1) set.add(newId());
    expect(set.size).toBe(20000);
  });
});
